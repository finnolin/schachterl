import { local_db } from '../db';

export class Users {
	private db = local_db.db;
	private schema = local_db.schema;

	constructor() {}

	async add() {
		// create user in local db
		const [user] = await this.db.insert(this.schema.user).values({ name: 'test' }).returning();
		console.log(user);
		// create change in local db
		const change_out = await this.db
			.insert(this.schema.change)
			.values({
				entity_id: user.id,
				entity_type: 'user',
				op: 'create',
				patch: JSON.stringify(user)
			})
			.returning();
		console.log(change_out);
	}
}
