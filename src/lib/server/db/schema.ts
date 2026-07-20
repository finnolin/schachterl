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

export const enum_resource_type = pgEnum('resource_type', ['note']);
export const resource = pgTable(
	'resource',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull().default('New Resource'),
		space_id: uuid('space_id')
			.notNull()
			.references(() => space.id, { onDelete: 'cascade' }),
		parent_id: uuid('parent_id').references((): AnyPgColumn => resource.id, {
			onDelete: 'cascade'
		}),
		sort_order: text('sort_order').notNull(),
		type: enum_resource_type().notNull(),
		created_at: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()),
		updated_at: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
		deleted_at: timestamp('deleted_at', { withTimezone: true }),
		version: integer('version').notNull().default(0)
	},
	(t) => [index('resource_space_id_idx').on(t.space_id)]
);
export type Resource = typeof resource.$inferSelect;

export const space = pgTable('space', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull().default('New Space'),
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
