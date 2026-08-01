import { app_context as app } from '../app/app-context.svelte';

export class ResourcesTypes {
	private schema = app.schema;

	async getResourceTypes() {
		const types = await app.db.select().from(this.schema.resource_type);
		return types;
	}

	async createResourceType() {}
}
