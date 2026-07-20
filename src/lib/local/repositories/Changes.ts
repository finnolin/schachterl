import { and, eq, desc, gt, inArray } from 'drizzle-orm';
import { type SQLiteTable, type SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { app_context as app } from '../app/app-context.svelte';
import { store } from '../app/store.svelte';
import type { ChangeInsert, Resource } from '../db/schema';
import log from '$lib/logger.svelte';
import { coerce } from '$lib/utils';
import { notify } from '../utils/invalidation';
import { type Change as RemoteChange } from '$lib/server/db/schema';
import { type EnumSycnedTables } from '../db/schema';
import { tree } from '../utils/tree.svelte';

const NO_COALESCE_FIELDS: Record<string, string[]> = {
	resource: ['parent_id']
};

const TABLES = {
	resource: app.schema.resource,
	user: app.schema.user,
	space: app.schema.space,
	space_user: app.schema.space_user
} as const satisfies Record<EnumSycnedTables, SQLiteTable & { id: SQLiteColumn }>;

export class Changes {
	async recordChange(change: ChangeInsert) {
		const db = app.db;
		const schema = app.schema;
		// try to merge updates into a pending change (skip FK fields)
		const { entity_type, entity_id, op, patch } = change;
		if (op === 'update' && patch && this.canCoalesce(entity_type, patch)) {
			const [pending] = await db
				.select()
				.from(schema.change)
				.where(
					and(
						eq(schema.change.entity_id, entity_id),
						eq(schema.change.synced, false),
						eq(schema.change.in_flight, false)
					)
				)
				.orderBy(desc(schema.change.seq))
				.limit(1);

			if (pending && pending.op !== 'delete') {
				await db
					.update(schema.change)
					.set({ patch: { ...(pending.patch as object), ...patch } })
					.where(eq(schema.change.seq, pending.seq));
				return;
			}
		}
		// write the change:
		const [new_change] = await db
			.insert(schema.change)
			.values({ entity_type, entity_id, op, patch: patch ?? null })
			.returning();
		log.db.debug(new_change);
	}

	private canCoalesce(entity_type: string, patch: Record<string, unknown>) {
		const blocked = NO_COALESCE_FIELDS[entity_type] ?? [];
		return !Object.keys(patch).some((k) => blocked.includes(k));
	}

	async claimBatch(limit: number) {
		const db = app.db;
		const schema = app.schema;
		const claimed = await db
			.update(schema.change)
			.set({ in_flight: true })
			.where(
				inArray(
					schema.change.seq,
					db
						.select({ seq: schema.change.seq })
						.from(schema.change)
						.where(and(eq(schema.change.synced, false), eq(schema.change.in_flight, false)))
						.orderBy(schema.change.seq)
						.limit(limit)
				)
			)
			.returning();

		// RETURNING doesn't guarantee order — restore it, ordering is load-bearing
		return claimed.sort((a, b) => a.seq - b.seq);
	}

	async markInFlight(seqs: number[]) {
		if (seqs.length === 0) return;
		await app.db
			.update(app.schema.change)
			.set({ in_flight: true })
			.where(inArray(app.schema.change.seq, seqs));
	}

	async releaseAllInFlight() {
		await app.db.update(app.schema.change).set({ in_flight: false });
	}

	async releaseInFlight(seqs: number[]) {
		if (seqs.length === 0) return;

		await app.db
			.update(app.schema.change)
			.set({ in_flight: false })
			.where(inArray(app.schema.change.seq, seqs));
	}

	async deleteByIds(ids: string[]) {
		if (ids.length === 0) return;
		await app.db.delete(app.schema.change).where(inArray(app.schema.change.id, ids));
	}

	async applyRemote(changes: RemoteChange[]) {
		const db = app.db;
		const my_client_id = await store.getProperty('client_id');

		for (const change of changes) {
			if (change.client_id === my_client_id) continue; // already applied locally

			const table = TABLES[change.entity_type as EnumSycnedTables];
			const patch = coerce(change.patch);
			console.log(change.id, change.op, change.client_id, my_client_id);
			switch (change.op) {
				case 'create':
					await db.insert(table).values(patch).onConflictDoUpdate({ target: table.id, set: patch });
					break;
				case 'update':
					await db.update(table).set(patch).where(eq(table.id, change.entity_id));
					break;
				case 'delete':
					await db.delete(table).where(eq(table.id, change.entity_id));
					break;
			}

			if (change.entity_type === 'resource') {
				if (change.op === 'delete') tree.remove(change.entity_id);
				else tree.upsert(coerce(change.patch) as Resource);
			}
		}

		notify('resources', 'spaces');
	}
}
