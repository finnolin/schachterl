import {
	sqliteTable,
	text,
	integer,
	index,
	primaryKey,
	unique,
	type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core';
import { v7 as uuid } from 'uuid';

export const drizzle_migrations = sqliteTable('__drizzle_migrations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	hash: text('hash').notNull(),
	tag: text('tag').notNull(),
	created_at: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
});
export type Migration = typeof drizzle_migrations.$inferSelect;

export const app_meta = sqliteTable('app_meta', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
export type AppMeta = typeof resource.$inferSelect;
export type AppMetaInsert = typeof resource.$inferInsert;

export const enum_synced_tables = [
	'resource_type',
	'resource',
	'user',
	'space',
	'space_user',
	'space_resource_type',
	'relationship_type',
	'relationship',
	'media'
] as const;

export type EnumSycnedTables = (typeof enum_synced_tables)[number];
export const change = sqliteTable('change', {
	seq: integer('seq').primaryKey({ autoIncrement: true }),
	id: text('id')
		.notNull()
		.unique()
		.$defaultFn(() => uuid()),
	entity_type: text({ enum: enum_synced_tables }).notNull(),
	entity_id: text('entity_id').notNull(),
	op: text('op', { enum: ['create', 'update', 'delete'] }).notNull(),
	patch: text('patch', { mode: 'json' }).$type<Record<string, unknown>>(),
	created_at: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
	in_flight: integer('in_flight', { mode: 'boolean' }).notNull().default(false),
	base_version: integer('base_version').notNull().default(0)
});

export type Change = typeof change.$inferSelect;
export type ChangeInsert = typeof change.$inferInsert;

export const user = sqliteTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuid()),
	name: text('name').notNull(),
	created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date())
});

export const enum_resource_types = ['note'] as const;
export type EnumResourceType = (typeof enum_resource_types)[number];

export type ResourceFieldConfig = {
	field: string; // key into your base-field pool: 'name' | 'url' | 'due' ...
	label?: string; // custom override; falls back to the field's default label
	//required?: boolean;
	//position?: number;
};

export const resource_type = sqliteTable('resource_type', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuid()),
	key: text('key').notNull().unique(),
	singular: text('singular').notNull(),
	plural: text('plural').notNull(),

	// UI
	icon: text('icon'),
	description: text('description'),

	field_config: text('field_config', { mode: 'json' }).$type<ResourceFieldConfig[]>(),

	created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: integer('deleted_at', { mode: 'timestamp_ms' })
});
export type ResourceType = typeof resource_type.$inferSelect;

export const media = sqliteTable('media', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuid()),
	space_id: text('space_id')
		.notNull()
		.references(() => space.id, { onDelete: 'cascade' }),
	file_path: text('file_path').notNull(),
	file_name: text('file_name').notNull(),
	mime_type: text('mime_type').notNull(),
	created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: integer('deleted_at', { mode: 'timestamp_ms' })
});
export type Media = typeof media.$inferSelect;

export const resource = sqliteTable(
	'resource',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => uuid()),
		space_id: text('space_id')
			.notNull()
			.references(() => space.id, { onDelete: 'cascade' }),
		parent_id: text('parent_id').references((): AnySQLiteColumn => resource.id, {
			onDelete: 'cascade'
		}),
		sort_order: text('sort_order').notNull(),
		name: text('name').notNull().default('New Resource'),
		type: text('type').references(() => resource_type.id),
		content: text('content'),
		url: text('url'),
		image: text('image').references(() => media.id),
		created_at: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updated_at: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
		deleted_at: integer('deleted_at', { mode: 'timestamp_ms' }),
		version: integer('version').notNull().default(0)
	},
	(t) => [
		index('resource_space_id_idx').on(t.space_id),
		index('resource_parent_sort_idx').on(t.parent_id, t.sort_order)
	]
);
export type Resource = typeof resource.$inferSelect;
export type ResourceInsert = typeof resource.$inferInsert;

export const relationship_type = sqliteTable('relationship_type', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuid()),
	key: text('key').notNull().unique(),
	forward_label: text('forward_label').notNull(),
	reverse_label: text('reverse_label').notNull(),
	symmetric: integer('symmetric', { mode: 'boolean' }).notNull().default(false),
	from_type: text('from_type').references(() => resource_type.id),
	to_type: text('to_type').references(() => resource_type.id),
	created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: integer('deleted_at', { mode: 'timestamp_ms' })
});
export type RelationshipType = typeof relationship_type.$inferSelect;

export const relationship = sqliteTable(
	'relationship',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => uuid()),
		space_id: text('space_id')
			.notNull()
			.references(() => space.id, { onDelete: 'cascade' }),
		relationship_type: text('relationship_type').references(() => relationship_type.id),
		from_resource: text('from_resource').references(() => resource.id),
		to_resource: text('to_resource').references(() => resource.id),
		created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
		updated_at: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
		deleted_at: integer('deleted_at', { mode: 'timestamp_ms' })
	},
	(t) => [
		index('rel_from_idx').on(t.from_resource),
		index('rel_to_idx').on(t.to_resource),
		index('rel_type_idx').on(t.relationship_type)
	]
);

export type Relationship = typeof relationship.$inferSelect;

export const space = sqliteTable('space', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuid()),
	name: text('name').notNull().default('New Space'),
	default_resource_type: text('default_resource_type')
		.notNull()
		.references(() => resource_type.id),
	created_at: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: integer('deleted_at', { mode: 'timestamp_ms' })
});
export type Space = typeof space.$inferSelect;
export type SpaceInsert = typeof space.$inferInsert;

export const enum_space_roles = ['owner', 'editor', 'viewer'] as const;
export type EnumSpaceRole = (typeof enum_space_roles)[number];

export const space_user = sqliteTable(
	'space_user',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => uuid()),
		space_id: text('space_id')
			.notNull()
			.references(() => space.id, { onDelete: 'cascade' }),
		user_id: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role', { enum: enum_space_roles }).notNull().default('viewer'),
		created_at: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updated_at: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
		deleted_at: integer('deleted_at', { mode: 'timestamp_ms' })
	},
	(t) => [
		unique('space_user_space_user_uq').on(t.space_id, t.user_id),
		index('space_user_user_id_idx').on(t.user_id)
	]
);
export type SpaceUser = typeof space_user.$inferSelect;
export type SpaceUserInsert = typeof space_user.$inferInsert;

export const space_resource_type = sqliteTable(
	'space_resource_type',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => uuid()),
		space_id: text('space_id')
			.notNull()
			.references(() => space.id),
		resource_type_id: text('resource_type_id')
			.notNull()
			.references(() => resource_type.id),
		created_at: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updated_at: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
		deleted_at: integer('deleted_at', { mode: 'timestamp_ms' })
	},
	(t) => [
		unique('space_recource_type_uq').on(t.space_id, t.resource_type_id),
		index('space_recource_type_idx').on(t.resource_type_id)
	]
);
export type SpaceResourceType = typeof space_resource_type.$inferSelect;

/*
 * Resource Types:
 * NOTE:
 * name
 * text
 * b
 * renders only text
 *
 * LIST:
 * list_items: ['children', 'reference']
 * renders a list of resources (either children or list field)
 *
 * TASK:
 * name
 * text
 * state
 * start
 * end
 * due
 * points
 * iteration (list): reference
 *
 * ITERATION (list):
 * name
 * start
 * end
 *
 * this should render as list of tasks
 *
 *
 */
