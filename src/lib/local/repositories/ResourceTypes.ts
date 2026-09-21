import { app_context as app } from '../app/app-context.svelte';
import { notify } from '../utils/invalidation';
import {
	space,
	type ResourceFieldConfig,
	type ResourceType,
	type SpaceResourceType
} from '../db/schema';
import { and, eq, notInArray } from 'drizzle-orm';

type BaseCreateResourceTypeInput = {
	key: string;
	singular: string;
	plural: string;
	icon?: string | null;
	description?: string | null;
	field_config?: ResourceFieldConfig[] | null;
};

type CreateResourceTypeInput = BaseCreateResourceTypeInput & {
	space_id: string;
};

export class ResourcesTypes {
	private schema = app.schema;

	async getResourceTypes() {
		const types = await app.db.select().from(this.schema.resource_type);
		return types;
	}

	async getSpaceResourceTypes(space_id: string) {
		const resource_types = await app.db
			.select({
				id: this.schema.resource_type.id,
				singular: this.schema.resource_type.singular,
				plural: this.schema.resource_type.plural,
				key: this.schema.resource_type.key,
				icon: this.schema.resource_type.icon,
				description: this.schema.resource_type.description,
				field_config: this.schema.resource_type.field_config
			})
			.from(this.schema.resource_type)
			.innerJoin(
				this.schema.space_resource_type,
				eq(this.schema.resource_type.id, this.schema.space_resource_type.resource_type_id)
			)
			.where(eq(this.schema.space_resource_type.space_id, space_id));
		return resource_types;
	}

	async createGlobalResourceType(input: BaseCreateResourceTypeInput) {
		const db = app.db;

		const [resource_type] = await db
			.insert(this.schema.resource_type)
			.values({
				key: input.key,
				singular: input.singular,
				plural: input.plural,
				icon: input.icon ?? null,
				description: input.description ?? null,
				field_config: input.field_config ?? null
			})
			.returning();

		notify('resource_types', 'spaces');
		return resource_type;
	}

	async createResourceType(input: CreateResourceTypeInput) {
		const resource_type = await this.createGlobalResourceType(input);
		const [space_resource_type] = await this.addResourceTypeToSpace(
			input.space_id,
			resource_type.id
		);
		return { resource_type, space_resource_type };
	}

	async updateResourceType(
		id: string,
		patch: Partial<
			Pick<ResourceType, 'singular' | 'plural' | 'icon' | 'description' | 'field_config'>
		>
	) {
		const db = app.db;

		const [updated] = await db
			.update(this.schema.resource_type)
			.set(patch)
			.where(eq(this.schema.resource_type.id, id))
			.returning();

		notify('resource_types');
		return updated;
	}

	async addResourceTypeToSpace(space_id: string, resource_type_id: string) {
		const db = app.db;
		const [space_resource_type] = await db
			.insert(this.schema.space_resource_type)
			.values({ space_id, resource_type_id })
			.returning();

		notify('spaces', 'resource_types');
		return [space_resource_type] as const;
	}

	async removeResourceTypeFromSpace(space_id: string, resource_type_id: string) {
		const t = app.schema;
		const db = app.db;
		const [space_resource_type] = await db
			.select({ id: t.space_resource_type.id })
			.from(t.space_resource_type)
			.where(
				and(
					eq(t.space_resource_type.space_id, space_id),
					eq(t.space_resource_type.resource_type_id, resource_type_id)
				)
			)
			.limit(1);

		if (!space_resource_type) return;
		const [is_default] = await db
			.select()
			.from(t.space)
			.where(and(eq(t.space.id, space_id), eq(t.space.default_resource_type, resource_type_id)));
		if (is_default) {
			console.log('not allowed');
			return;
		}
		await db
			.delete(this.schema.space_resource_type)
			.where(eq(this.schema.space_resource_type.id, space_resource_type.id));

		notify(`space:${space_id}`);
	}

	async getResourceTypeById(id: string) {
		const db = app.db;
		const [resource_type] = await db
			.select()
			.from(this.schema.resource_type)
			.where(eq(this.schema.resource_type.id, id))
			.limit(1);
		return resource_type;
	}

	async getAvailableResourceTypesForSpace(space_id: string) {
		const db = app.db;
		const attached = await db
			.select({ resource_type_id: this.schema.space_resource_type.resource_type_id })
			.from(this.schema.space_resource_type)
			.where(eq(this.schema.space_resource_type.space_id, space_id));

		const attached_ids = attached.map((row) => row.resource_type_id);

		if (attached_ids.length === 0) {
			return db.select().from(this.schema.resource_type);
		}

		return db
			.select()
			.from(this.schema.resource_type)
			.where(notInArray(this.schema.resource_type.id, attached_ids));
	}
}
