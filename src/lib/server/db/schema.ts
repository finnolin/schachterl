import { pgTable, serial, text, timestamp, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core';

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
