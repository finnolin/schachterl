import { app_context as app } from '../app/app-context.svelte';
import { store } from '../app/store.svelte';
import type { SpaceInsert, Space } from '../db/schema';
import { Changes } from './Changes';
import { notify } from '../utils/invalidation';
import { eq, isNull, and } from 'drizzle-orm';
import { v7 as uuid } from 'uuid';
import * as IDs from '../utils/ids';
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

		const [resource_type] = await db
			.insert(schema.space_resource_type)
			.values({
				id: uuid(),
				space_id: row.id,
				resource_type_id: IDs.NOTE_TYPE_ID
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
		await new Changes().recordChange({
			entity_id: resource_type.id,
			entity_type: 'space_resource_type',
			op: 'create',
			patch: resource_type
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

	async getSpaceById(id: string) {
		const [space] = await app.db
			.select()
			.from(app.schema.space)
			.where(eq(app.schema.space.id, id))
			.limit(1);

		if (!space) return undefined;

		const types = await app.db
			.select({
				// pull the global type fields, not the junction row
				id: app.schema.resource_type.id,
				key: app.schema.resource_type.key,
				singular: app.schema.resource_type.singular,
				plural: app.schema.resource_type.plural,
				icon: app.schema.resource_type.icon,
				field_config: app.schema.resource_type.field_config
			})
			.from(app.schema.space_resource_type)
			.innerJoin(
				app.schema.resource_type,
				eq(app.schema.space_resource_type.resource_type_id, app.schema.resource_type.id)
			)
			.where(
				and(
					eq(app.schema.space_resource_type.space_id, id),
					isNull(app.schema.space_resource_type.deleted_at),
					isNull(app.schema.resource_type.deleted_at)
				)
			);

		return { ...space, resource_types: types };
	}
}
