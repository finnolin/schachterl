import { local_db } from '../db';
import { Changes } from './Changes';
import type { ResourceInsert } from '../db/schema';

export class Resources {
	private db = local_db.db;
	private schema = local_db.schema;

	constructor() {}

	async createResource(values: ResourceInsert) {
		const db = local_db.db;
		//const row = await local_db.withTransaction(async () => {
		const [row] = await db.insert(this.schema.resource).values(values).returning();
		await new Changes().recordChange({
			entity_id: row.id,
			entity_type: 'resource',
			op: 'create',
			patch: row
		});
		return row;
		//});
		return row;
	}
}
