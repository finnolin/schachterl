import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
	user: {
		spaces: r.many.space_user()
	},
	space: {
		resources: r.many.resource(),
		members: r.many.space_user(),
		// through relation: space -> users directly
		users: r.many.user({
			from: r.space.id.through(r.space_user.space_id),
			to: r.user.id.through(r.space_user.user_id)
		})
	},
	resource: {
		space: r.one.space({
			from: r.resource.space_id,
			to: r.space.id,
			optional: false
		})
	},
	space_user: {
		space: r.one.space({
			from: r.space_user.space_id,
			to: r.space.id,
			optional: false
		}),
		user: r.one.user({
			from: r.space_user.user_id,
			to: r.user.id,
			optional: false
		})
	}
}));
