import {
	pgTable,
	serial,
	text,
	timestamp,
	boolean,
	uuid,
	pgEnum,
	integer,
	pgSequence,
	jsonb,
	primaryKey,
	unique,
	index,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import type { ResourceFieldConfig } from '#lib/local/db/schema.js';
import { local_db } from '#lib/local/db/index.js';

// * Auth tables:
export const user_role_enum = pgEnum('user_roles', ['user', 'admin']);
export const user = pgTable('user', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	email_verified: boolean('email_verified'),
	image: text('image'),
	role: user_role_enum('role').notNull().default('user'),
	created_at: timestamp('created_at', { withTimezone: true }).notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	last_login: timestamp('last_login', { withTimezone: true })
	//database_id: uuid('database_id')
});
export type User = typeof user.$inferSelect;

export const session = pgTable('session', {
	id: uuid('id').primaryKey().defaultRandom(),
	user_id: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
	token: text('token').notNull(),
	expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
	ip_address: text('ip_address'),
	user_agent: text('user_agent'),
	client_id: text('client_id'),
	created_at: timestamp('created_at', { withTimezone: true }).notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date())
});
export type Session = typeof session.$inferSelect;

export const account = pgTable('account', {
	id: uuid('id').primaryKey().defaultRandom(),
	user_id: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
	issuer: text('issuer'),
	account_id: text('account_id').notNull(),
	provider_id: text('provider_id').notNull(),
	access_token: text('access_token'),
	access_token_expires: timestamp('access_token_expires', { withTimezone: true }),
	refresh_token: text('refresh_token'),
	refresh_token_expires: timestamp('refresh_token_expires', { withTimezone: true }),
	scope: text('scope'),
	id_token: text('id_token'),
	password_hash: text('password_hash'),
	created_at: timestamp('created_at', { withTimezone: true }).notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date())
});
export type Account = typeof account.$inferSelect;

export const verification = pgTable('verification', {
	id: serial('id').primaryKey().notNull(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expires: timestamp('expires').notNull(),
	created_at: timestamp('created_at', { withTimezone: true }).notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date())
});

export const enum_change_operation = pgEnum('change_operation', ['create', 'update', 'delete']);
export const change = pgTable('change', {
	id: uuid('id').primaryKey().defaultRandom(),
	seq: integer('seq').notNull().generatedAlwaysAsIdentity({
		name: 'change_seq',
		startWith: 1,
		increment: 1
	}),
	space_id: uuid('space_id'),
	target_user_id: uuid('target_user_id'),
	entity_type: text('entity_type').notNull(),
	entity_id: uuid('entity_id').notNull(),

	op: enum_change_operation().notNull(),
	patch: jsonb('patch').$type<Record<string, unknown>>(),

	user_id: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
	client_id: uuid('client_id').notNull(),
	created_at: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()),
	base_version: integer('base_version').notNull()
});
export type Change = typeof change.$inferSelect;

export const resource_type = pgTable('resource_type', {
	id: uuid('id').primaryKey().defaultRandom(),
	key: text('key').notNull().unique(),
	singular: text('singular').notNull(),
	plural: text('plural').notNull(),

	icon: text('icon'),
	description: text('description'),

	field_config: jsonb('field_config').$type<ResourceFieldConfig[]>(),

	created_at: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()),
	updated_at: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: timestamp('deleted_at', { withTimezone: true })
});
export type ResourceType = typeof resource_type.$inferSelect;

export const media = pgTable('media', {
	id: uuid('id').primaryKey().defaultRandom(),
	space_id: uuid('space_id')
		.notNull()
		.references(() => space.id, { onDelete: 'cascade' }),
	file_path: text('file_path').notNull(),
	file_name: text('file_name').notNull(),
	mime_type: text('mime_type').notNull(),
	created_at: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()),
	updated_at: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: timestamp('deleted_at', { withTimezone: true })
});
export type Media = typeof media.$inferSelect;

export const resource = pgTable(
	'resource',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		space_id: uuid('space_id')
			.notNull()
			.references(() => space.id, { onDelete: 'cascade' }),
		parent_id: uuid('parent_id').references((): AnyPgColumn => resource.id, {
			onDelete: 'cascade'
		}),
		sort_order: text('sort_order').notNull(),
		name: text('name').notNull().default('New Resource'),
		type: uuid('type').references(() => resource_type.id),
		content: text('content'),
		url: text('url'),
		image: uuid('image').references(() => media.id),
		created_at: timestamp('created_at', { withTimezone: true })
			.notNull()
			.$defaultFn(() => new Date()),
		updated_at: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
		deleted_at: timestamp('deleted_at', { withTimezone: true }),
		version: integer('version').notNull().default(0)
	},
	(t) => [
		index('resource_space_id_idx').on(t.space_id),
		index('resource_parent_sort_idx').on(t.parent_id, t.sort_order)
	]
);
export type Resource = typeof resource.$inferSelect;
export type ResourceInsert = typeof resource.$inferInsert;

export const relationship_type = pgTable('relationship_type', {
	id: uuid('id').primaryKey().defaultRandom(),
	key: text('key').notNull().unique(),
	forward_label: text('forward_label').notNull(),
	reverse_label: text('reverse_label').notNull(),
	symmetric: boolean('symmetric').notNull().default(false),
	from_type: uuid('from_type').references(() => resource_type.id),
	to_type: uuid('to_type').references(() => resource_type.id),
	created_at: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()),
	updated_at: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: timestamp('deleted_at', { withTimezone: true })
});
export type RelationshipType = typeof relationship_type.$inferSelect;

export const relationship = pgTable(
	'relationship',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		space_id: uuid('space_id')
			.notNull()
			.references(() => space.id, { onDelete: 'cascade' }),
		relationship_type: uuid('relationship_type').references(() => relationship_type.id),
		from_resource: uuid('from_resource').references(() => resource.id),
		to_resource: uuid('to_resource').references(() => resource.id),
		created_at: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()),
		updated_at: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
		deleted_at: timestamp('deleted_at', { withTimezone: true })
	},
	(t) => [
		index('rel_from_idx').on(t.from_resource),
		index('rel_to_idx').on(t.to_resource),
		index('rel_type_idx').on(t.relationship_type)
	]
);
export type Relationship = typeof relationship.$inferSelect;

export const space = pgTable('space', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull().default('New Space'),
	default_resource_type: uuid('default_resource_type')
		.notNull()
		.references(() => resource_type.id),
	created_by: uuid('created_by')
		.notNull()
		.references(() => user.id),
	created_at: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()),
	updated_at: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: timestamp('deleted_at', { withTimezone: true })
});
export type Space = typeof space.$inferSelect;

export const space_role_enum = pgEnum('space_roles', ['owner', 'editor', 'viewer']);
export const space_user = pgTable(
	'space_user',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		space_id: uuid('space_id')
			.notNull()
			.references(() => space.id, { onDelete: 'cascade' }),
		user_id: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: space_role_enum('role').notNull().default('viewer'),
		created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updated_at: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date())
	},
	(t) => [
		unique('space_user_space_user_uq').on(t.space_id, t.user_id),
		index('space_user_user_id_idx').on(t.user_id)
	]
);
export type SpaceUser = typeof space_user.$inferSelect;

export const space_resource_type = pgTable(
	'space_resource_type',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		space_id: uuid('space_id')
			.notNull()
			.references(() => space.id, { onDelete: 'cascade' }),
		resource_type_id: uuid('resource_type_id')
			.notNull()
			.references(() => resource_type.id, { onDelete: 'cascade' }),
		created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updated_at: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
		deleted_at: timestamp('deleted_at', { withTimezone: true })
	},
	(t) => [
		unique('space_resource_type_space_resource_type_uq').on(t.space_id, t.resource_type_id),
		index('space_resource_type_resource_type_id_idx').on(t.resource_type_id)
	]
);
export type SpaceResourceType = typeof space_resource_type.$inferSelect;
