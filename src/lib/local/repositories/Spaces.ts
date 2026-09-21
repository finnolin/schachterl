import { app_context as app } from '../app/app-context.svelte';
import { store } from '../app/store.svelte';
import type { SpaceInsert, Space } from '../db/schema';
import { notify } from '../utils/invalidation';
import { eq } from 'drizzle-orm';
import { v7 as uuid } from 'uuid';
import * as IDs from '../utils/ids';
export class Spaces {
	async createSpace(space: Omit<SpaceInsert, 'created_by'>) {
		const db = app.db;
		const schema = app.schema;
		if (!store.remote_user_id) {
			return;
		}
		const user_id = store.remote_user_id;

		const [row] = await db
			.insert(schema.space)
			.values({ ...space, created_by: user_id })
			.returning();

		await db
			.insert(schema.space_user)
			.values({
				id: uuid(),
				space_id: row.id,
				user_id,
				role: 'owner'
			})
			.returning();

		await db
			.insert(schema.space_resource_type)
			.values({
				id: uuid(),
				space_id: row.id,
				resource_type_id: IDs.NOTE_TYPE_ID
			})
			.returning();

		notify('spaces');
		return row;
	}
	async updateSpace(
		id: string,
		values: Partial<Pick<Space, 'name' | 'default_resource_type' | 'icon'>>
	) {
		await app.db.update(app.schema.space).set(values).where(eq(app.schema.space.id, id));

		notify('spaces', 'space:' + id);
		console.log('updated space');
	}

	async deleteSpace(id: string) {
		const [row] = await app.db
			.delete(app.schema.space)
			.where(eq(app.schema.space.id, id))
			.returning();

		notify('spaces');
		return row;
	}
	async getSpaces() {
		return await app.db.select().from(app.schema.space);
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
				description: app.schema.resource_type.description,
				field_config: app.schema.resource_type.field_config
			})
			.from(app.schema.space_resource_type)
			.innerJoin(
				app.schema.resource_type,
				eq(app.schema.space_resource_type.resource_type_id, app.schema.resource_type.id)
			)
			.where(eq(app.schema.space_resource_type.space_id, id));

		const space_users = await app.db
			.select()
			.from(app.schema.space_user)
			.where(eq(app.schema.space_user.space_id, id));

		const users = await app.db
			.select({
				// pull the global type fields, not the junction row
				id: app.schema.user.id,
				name: app.schema.user.name,
				role: app.schema.space_user.role
			})
			.from(app.schema.space_user)
			.innerJoin(app.schema.user, eq(app.schema.space_user.user_id, app.schema.user.id))
			.where(eq(app.schema.space_user.space_id, id));

		return { ...space, resource_types: types, space_users, users: users };
	}

	async setDefaultResourceType(space_id: string, resource_type_id: string) {
		this.updateSpace(space_id, { default_resource_type: resource_type_id });
	}
}
