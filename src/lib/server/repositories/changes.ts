import { db, schema, type ServerTx } from '../db';
import { coerce } from '#lib/utils.js';
import { createSelectSchema } from 'drizzle-zod';
import * as local_schema from '#lib/local/db/schema.js';
import { type EnumSycnedTables } from '#lib/local/db/schema.js';
import { type PgTable, type PgColumn } from 'drizzle-orm/pg-core';
import { eq, and, gt, or, asc, inArray } from 'drizzle-orm';
import z from 'zod';

//const change_schema = createSelectSchema(local_schema.change);
type Scope = { space_id: string | null; target_user_id: string | null };
type Decision = 'allow' | 'denied_read' | 'denied_write';

export const change_in_schema = createSelectSchema(local_schema.change)
	.pick({
		id: true,
		entity_type: true,
		entity_id: true,
		op: true,
		base_version: true
	})
	.extend({
		patch: z.record(z.string(), z.unknown()).nullable(),
		created_at: z.coerce.date()
	});
export type Change = z.infer<typeof change_in_schema>;

export type ChangeResult =
	| { id: string; status: 'accepted' }
	| { id: string; status: 'denied_write'; snapshot: Record<string, unknown> }
	| { id: string; status: 'denied_read' };

const TABLES = {
	resource: schema.resource,
	resource_type: schema.resource_type,
	relationship_type: schema.relationship_type,
	relationship: schema.relationship,
	media: schema.media,
	user: schema.user,
	space: schema.space,
	space_user: schema.space_user,
	space_resource_type: schema.space_resource_type
} as const satisfies Record<EnumSycnedTables, PgTable & { id: PgColumn }>;

export class Changes {
	async getChanges(user_id: string, since: number, limit = 500) {
		const member_spaces = db
			.select({ space_id: schema.space_user.space_id })
			.from(schema.space_user)
			.where(eq(schema.space_user.user_id, user_id));

		const rows = await db
			.select()
			.from(schema.change)
			.where(
				and(
					gt(schema.change.seq, since),
					or(
						inArray(schema.change.space_id, member_spaces),
						eq(schema.change.target_user_id, user_id),
						inArray(schema.change.entity_type, ['resource_type', 'relationship_type'])
					)
				)
			)
			.orderBy(asc(schema.change.seq))
			.limit(limit);

		return {
			changes: rows,
			cursor: rows.at(-1)?.seq ?? since,
			has_more: rows.length === limit
		};
	}

	async insertChange(
		tx: ServerTx,
		change: Change,
		user_id: string,
		client_id: string,
		user_role: string
	): Promise<ChangeResult> {
		const { space_id, target_user_id } = await this.resolveScope(tx, change);
		console.log(space_id, target_user_id);
		const decision = await this.authorize(tx, change, user_id, space_id, user_role);
		console.log(decision);
		if (decision === 'denied_read') return { id: change.id, status: 'denied_read' };
		if (decision === 'denied_write') {
			return { id: change.id, status: 'denied_write', snapshot: await this.snapshot(tx, change) };
		}
		// set created_by to current user
		if (change.entity_type === 'space' && change.op === 'create') {
			change.patch = { ...change.patch, created_by: user_id };
		}
		console.log(change);
		const [new_change] = await tx
			.insert(schema.change)
			.values({
				id: change.id, // client's id — this is the idempotency key
				entity_type: change.entity_type,
				entity_id: change.entity_id,
				op: change.op,
				patch: change.patch,
				space_id,
				client_id,
				user_id,
				target_user_id,
				base_version: change.base_version
			})
			.onConflictDoNothing({ target: schema.change.id })
			.returning({ id: schema.change.id });
		if (!new_change) {
			return { id: change.id, status: 'accepted' };
		}

		await this.commitChange(tx, change); // TODO
		return { id: change.id, status: 'accepted' };
	}

	private async resolveScope(tx: ServerTx, change: Change): Promise<Scope> {
		switch (change.entity_type) {
			case 'user':
				return { space_id: null, target_user_id: change.entity_id };

			case 'space':
				return { space_id: change.entity_id, target_user_id: null };

			case 'resource': {
				const from_patch = change.patch?.space_id;
				if (typeof from_patch === 'string') {
					return { space_id: from_patch, target_user_id: null };
				}

				const [row] = await tx
					.select({ space_id: schema.resource.space_id })
					.from(schema.resource)
					.where(eq(schema.resource.id, change.entity_id))
					.limit(1);

				if (!row) throw new Error(`unknown resource ${change.entity_id}`);
				return { space_id: row.space_id, target_user_id: null };
			}

			case 'relationship': {
				const from_patch = change.patch?.space_id;
				if (typeof from_patch === 'string') {
					return { space_id: from_patch, target_user_id: null };
				}
				const [row] = await tx
					.select({ space_id: schema.relationship.space_id })
					.from(schema.relationship)
					.where(eq(schema.relationship.id, change.entity_id))
					.limit(1);

				if (!row) throw new Error(`unknown relationship ${change.entity_id}`);
				return { space_id: row.space_id, target_user_id: null };
			}

			case 'media': {
				const from_patch = change.patch?.space_id;
				if (typeof from_patch === 'string') {
					return { space_id: from_patch, target_user_id: null };
				}
				const [row] = await tx
					.select({ space_id: schema.media.space_id })
					.from(schema.media)
					.where(eq(schema.media.id, change.entity_id))
					.limit(1);

				if (!row) throw new Error(`unknown media ${change.entity_id}`);
				return { space_id: row.space_id, target_user_id: null };
			}

			case 'space_user': {
				const patch_space = change.patch?.space_id;
				const patch_user = change.patch?.user_id;
				if (typeof patch_space === 'string' && typeof patch_user === 'string') {
					return { space_id: patch_space, target_user_id: patch_user };
				}

				const [row] = await tx
					.select({
						space_id: schema.space_user.space_id,
						user_id: schema.space_user.user_id
					})
					.from(schema.space_user)
					.where(eq(schema.space_user.id, change.entity_id))
					.limit(1);

				if (!row) throw new Error(`unknown space_user ${change.entity_id}`);
				return { space_id: row.space_id, target_user_id: row.user_id };
			}

			case 'space_resource_type': {
				const from_patch = change.patch?.space_id;
				if (typeof from_patch === 'string') {
					return { space_id: from_patch, target_user_id: null };
				}
				const [row] = await tx
					.select({ space_id: schema.space_resource_type.space_id })
					.from(schema.space_resource_type)
					.where(eq(schema.space_resource_type.id, change.entity_id))
					.limit(1);

				if (!row) throw new Error(`unknown space_resource_type ${change.entity_id}`);
				return { space_id: row.space_id, target_user_id: null };
			}

			default:
				return { space_id: null, target_user_id: null };
		}
	}

	private async roleInSpace(tx: ServerTx, user_id: string, space_id: string) {
		const [membership] = await tx
			.select({ role: schema.space_user.role })
			.from(schema.space_user)
			.where(and(eq(schema.space_user.user_id, user_id), eq(schema.space_user.space_id, space_id)))
			.limit(1);

		if (membership) return membership.role;

		// fall back: creator is implicitly owner
		const [space] = await tx
			.select({ created_by: schema.space.created_by })
			.from(schema.space)
			.where(eq(schema.space.id, space_id))
			.limit(1);

		return space?.created_by === user_id ? 'owner' : null;
	}

	private async authorize(
		tx: ServerTx,
		change: Change,
		user_id: string,
		space_id: string | null,
		user_role: string
	): Promise<Decision> {
		if (change.entity_type === 'resource_type' || change.entity_type === 'relationship_type') {
			if (user_role === 'admin') {
				return 'allow';
			}
			return 'denied_write';
		}
		if (change.entity_type === 'user') {
			if (change.op === 'create') return user_role === 'admin' ? 'allow' : 'denied_write';
			if (change.op === 'update') {
				if (user_role === 'admin') return 'allow';
				return change.entity_id === user_id ? 'allow' : 'denied_write';
			}
			return 'denied_write';
		}

		if (!space_id) return 'allow';
		if (change.entity_type === 'space' && change.op === 'create') return 'allow';

		const role = await this.roleInSpace(tx, user_id, space_id);
		if (!role) return 'denied_read';
		if (role === 'viewer') return 'denied_write';
		if (
			(change.entity_type === 'space_user' || change.entity_type === 'space_resource_type') &&
			role !== 'owner'
		) {
			return 'denied_write';
		}

		return 'allow';
	}

	async commitChange(tx: ServerTx, change: Change) {
		switch (change.entity_type) {
			default:
				return this.applyOp(tx, change); // everything normal
		}
	}

	// TODO: for relationships: validate endpoints belong to space_id — authz, not just integrity

	private async applyOp(tx: ServerTx, change: Change) {
		// if (change.entity_type === 'user' && change.op !== 'update') {
		// 	throw new Error(`op '${change.op}' not allowed on user`);
		// }
		const entity_type = change.entity_type as EnumSycnedTables;
		const table = TABLES[entity_type];
		const patch = coerce(change.patch);

		switch (change.op) {
			case 'create':
				await tx
					.insert(table)
					.values(patch as any)
					.onConflictDoUpdate({ target: table.id, set: patch as any });
				break;
			case 'update':
				await tx
					.update(table)
					.set(patch as any)
					.where(eq(table.id, change.entity_id));
				break;
			case 'delete':
				await tx.delete(table).where(eq(table.id, change.entity_id));
				break;
		}
	}

	private async snapshot(tx: ServerTx, change: Change): Promise<Record<string, unknown>> {
		const entity_type = change.entity_type as EnumSycnedTables;
		const table = TABLES[entity_type];
		const [row] = await tx.select().from(table).where(eq(table.id, change.entity_id)).limit(1);

		return row ?? { id: change.entity_id, _missing: true };
	}
}
