import { schema, type ServerTx } from '../db';
import { createSelectSchema } from 'drizzle-orm/zod';
import * as local_schema from '$lib/local/db/schema';
import { type EnumSycnedTables } from '$lib/local/db/schema';
import { type PgTable } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import z from 'zod';

//const change_schema = createSelectSchema(local_schema.change);

export const change_in_schema = createSelectSchema(local_schema.change).extend({
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
	user: schema.user
} satisfies Record<EnumSycnedTables, PgTable>;

export class Changes {
	async insertChange(
		tx: ServerTx,
		change: Change,
		user_id: string,
		client_id: string
	): Promise<ChangeResult> {
		console.log(change);

		// TODO: check write/read access

		const [new_change] = await tx
			.insert(schema.change)
			.values({
				id: change.id, // client's id — this is the idempotency key
				entity_type: change.entity_type,
				entity_id: change.entity_id,
				op: change.op,
				patch: change.patch,
				client_id: client_id,
				user_id: user_id,
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

	async commitChange(tx: ServerTx, change: Change) {
		switch (change.entity_type) {
			default:
				return this.applyOp(tx, change); // everything normal
		}
	}

	private async applyOp(tx: ServerTx, change: Change) {
		if (change.entity_type === 'user' && change.op !== 'update') {
			throw new Error(`op '${change.op}' not allowed on user`);
		}
		const table = TABLES[change.entity_type]; // change.entity_type is EnumSycnedTables → no `as`, no undefined check needed
		const patch = this.coerce(change.patch);

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
	private coerce(patch: Record<string, unknown> | null): Record<string, unknown> {
		if (!patch) return {};
		const out = { ...patch };
		for (const field of ['created_at', 'updated_at', 'deleted_at']) {
			if (typeof out[field] === 'string') out[field] = new Date(out[field] as string);
		}
		return out;
	}
}
