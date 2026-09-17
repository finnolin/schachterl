import { relations as defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const userRelations = defineRelations(schema.user, ({ many }) => ({
	spaces: many(schema.space_user)
}));

export const spaceRelations = defineRelations(schema.space, ({ many }) => ({
	resources: many(schema.resource),
	members: many(schema.space_user)
}));

export const resourceRelations = defineRelations(schema.resource, ({ one }) => ({
	space: one(schema.space, {
		fields: [schema.resource.space_id],
		references: [schema.space.id]
	})
}));

export const spaceUserRelations = defineRelations(schema.space_user, ({ one }) => ({
	space: one(schema.space, {
		fields: [schema.space_user.space_id],
		references: [schema.space.id]
	}),
	user: one(schema.user, {
		fields: [schema.space_user.user_id],
		references: [schema.user.id]
	})
}));

// Drizzle 0.x uses one relation declaration per table. The v1-only through
// relation (space -> users through space_user) is intentionally omitted; query
// it through `space_user` instead.
export const relations = {
	userRelations,
	spaceRelations,
	resourceRelations,
	spaceUserRelations
};
