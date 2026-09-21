import { app_context as app } from '../app/app-context.svelte';

export class Users {
	private db = app.db;
	private schema = app.schema;

	async add() {
		const [user] = await this.db.insert(this.schema.user).values({ name: 'local' }).returning();
	}

	async getUsers() {
		const users = await this.db.select().from(this.schema.user);
		return users;
	}
}
