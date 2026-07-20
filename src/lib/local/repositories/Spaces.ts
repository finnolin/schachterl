import { app_context as app } from '../app/app-context.svelte';
import { store } from '../app/store.svelte';
import type { SpaceInsert } from '../db/schema';
import { Changes } from './Changes';
import { notify } from '../utils/invalidation';
import { eq, isNull } from 'drizzle-orm';
import { v7 as uuid } from 'uuid';

export class Spaces {
	async createSpace(space: SpaceInsert) {
		const db = app.db;
		const schema = app.schema;
		const user_id = await store.getOrCreateLocalUserId();

		const [row] = await db.insert(schema.space).values(space).returning();

		const [membership] = await db
			.insert(schema.space_user)
			.values({
				id: uuid(),
				space_id: row.id,
				user_id,
				role: 'owner'
			})
			.returning();

		await new Changes().recordChange({
			entity_id: row.id,
			entity_type: 'space',
			op: 'create',
			patch: row
		});
		await new Changes().recordChange({
			entity_id: membership.id,
			entity_type: 'space_user',
			op: 'create',
			patch: membership
		});

		notify('spaces');
		return row;
	}
	async deleteSpace(id: string) {
		const deleted_at = new Date();
		const [row] = await app.db
			.update(app.schema.space)
			.set({ deleted_at })
			.where(eq(app.schema.space.id, id))
			.returning();

		await new Changes().recordChange({
			entity_id: id,
			entity_type: 'space',
			op: 'update',
			patch: { deleted_at }
		});
		notify('spaces');
		return row;
	}
	async getSpaces() {
		const spaces = await app.db
			.select()
			.from(app.schema.space)
			.where(isNull(app.schema.space.deleted_at));
		return spaces;
	}
}
