import { local_db } from '$lib/local/db';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { v7 as uuid } from 'uuid';
import log from '$lib/logger.svelte';
import { eq } from 'drizzle-orm';
import { isTauri } from '@tauri-apps/api/core';
const schema = local_db.schema;

export class AppContext {
	private db: SqliteRemoteDatabase<typeof schema> | null = null;
	client_id: string | null = null;
	server_address: string | null = $state(null);
	is_tauri: boolean = $state(isTauri());

	async initialize() {
		log.app.debug('Initializing app context...');
		this.db = local_db.db;
		await this.initClientID();
	}

	async initClientID() {
		if (!this.db) return;
		const [client_id] = await this.db
			.select()
			.from(schema.app_meta)
			.where(eq(schema.app_meta.key, 'client_id'));
		if (!client_id) {
			const new_client_id = uuid();
			log.app.debug('No client ID found...');
			log.app.info('Setting client ID: ' + new_client_id);
			await this.setAppMeta('client_id', new_client_id);
			this.client_id = new_client_id;
		} else {
			this.client_id = client_id.value;
		}
		log.app.info('Client ID: ' + this.client_id);
		this.initServer();
	}
	async initServer() {
		if (isTauri()) {
			log.app.debug('Checking server...');
			const server_address = await this.getAppMeta('server');
			if (!server_address) {
				log.app.info('No server configured.');
			} else {
				log.app.debug('Server:' + server_address);
				this.server_address = server_address;
			}
		}
	}

	async setServer(server_address: string) {
		if (!isTauri()) return;
		await this.setAppMeta('server', server_address);
		this.server_address = server_address;
	}
	async clearServer() {
		if (!isTauri()) return;
		await this.deleteAppMeta('server');
		this.server_address = null;
	}

	async getAppMeta(property_name: string) {
		if (!this.db) return;
		const [property] = await this.db
			.select()
			.from(schema.app_meta)
			.where(eq(schema.app_meta.key, property_name));
		if (property && property.value) {
			return property.value;
		} else {
			return;
		}
	}

	async setAppMeta(property_key: string, property_value: string) {
		if (!this.db) return;
		await this.deleteAppMeta(property_key);
		await this.db.insert(schema.app_meta).values({ key: property_key, value: property_value });
		log.app.info('Set Meta: ' + property_key + ' / ' + property_value);
	}

	async deleteAppMeta(property_key: string) {
		if (!this.db) return;
		await this.db.delete(schema.app_meta).where(eq(schema.app_meta.key, property_key));
	}
}

export const app_context = new AppContext();
