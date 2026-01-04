import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
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

export const user = sqliteTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuid()),
	name: text('name').notNull(),
	created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date())
});

export const enum_resource_types = ['doc', 'link', 'image'] as const;
export type EnumResourceType = (typeof enum_resource_types)[number];

export const resource = sqliteTable('resource', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuid()),
	type: text({ enum: enum_resource_types }),
	created_at: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date()),
	deleted_at: integer('deleted_at', { mode: 'timestamp_ms' }),
	version: integer('version').default(0),
	origin: text('origin')
});
export type Resource = typeof resource.$inferSelect;
export type ResourceInsert = typeof resource.$inferInsert;
