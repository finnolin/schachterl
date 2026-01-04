import { databaseService } from '$lib/local/db';
import { v7 as uuid } from 'uuid';
import log from '$lib/logger.svelte';
import { eq } from 'drizzle-orm';
import type { createCapacitorDrizzle } from '../db/capacitor-drizzle';
const schema = databaseService.schema;

export class AppContext {
	private db: ReturnType<typeof createCapacitorDrizzle> | null = null;

	async initialize() {
		log.app.debug('Initializing app context...');
		this.db = databaseService.db;
		const [client_id] = await this.db
			.select()
			.from(schema.app_meta)
			.where(eq(schema.app_meta.key, 'client_id'));
		if (!client_id) {
			const new_client_id = uuid();
			log.app.debug('No client ID found...');
			log.app.info('Setting client ID: ' + new_client_id);
			await this.db.insert(schema.app_meta).values({ key: 'client_id', value: new_client_id });
		} else {
			log.app.debug('Client ID: ' + client_id.value);
		}
	}
}

export const app_context = new AppContext();
