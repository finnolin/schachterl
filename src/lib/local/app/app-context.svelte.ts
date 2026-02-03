import { resolve } from '$app/paths';
import { goto } from '$app/navigation';
import { local_db, DatabaseService } from '$lib/local/db';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { v7 as uuid } from 'uuid';
import log from '$lib/logger.svelte';
import { eq } from 'drizzle-orm';
import { isTauri } from '@tauri-apps/api/core';
import * as schema from '$lib/local/db/schema';
import { store } from '$lib/local/app/store.svelte';
import { auth } from '$lib/local/app/auth.svelte';

export class AppContext {
	private Database: DatabaseService | undefined;
	private drizzle: SqliteRemoteDatabase<typeof schema> | null = $state(null);
	private drizzle_schema = schema;

	is_tauri: boolean = $state(isTauri());

	async initialize() {
		log.app.debug('Initializing app context...');

		// 2. Client ID:
		await store.getProperty('client_id');
		if (!store.client_id) {
			log.app.info('Creating new client_id...');
			const client_id = uuid();
			store.setProperty('client_id', client_id);
		}

		if (this.is_tauri) {
			// Server Address:
			await store.getProperty('server_url');

			// Bearer Token:
			await store.getProperty('bearer_token');
		}
		await auth.initialize();
	}

	async setServer(server_url: string) {
		if (!isTauri()) return;
		await store.setProperty('server_url', server_url);
		await auth.initialize();
	}

	async clearServer() {
		if (!isTauri()) return;
		await store.clearProperty('server_url');
	}

	async getAppMeta(property_name: string) {
		if (!this.drizzle) return;
		console.log('get meta', property_name);

		const [property] = await this.drizzle
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
		if (!this.drizzle) return;
		await this.deleteAppMeta(property_key);
		await this.drizzle.insert(schema.app_meta).values({ key: property_key, value: property_value });
		log.app.info('Set Meta: ' + property_key + ' / ' + property_value);
	}

	async deleteAppMeta(property_key: string) {
		if (!this.drizzle) return;
		await this.drizzle.delete(schema.app_meta).where(eq(schema.app_meta.key, property_key));
	}

	get db() {
		if (!this.drizzle) {
			return;
			//throw new Error('Database not initialized. Call initialize() first.');
		}
		return this.drizzle;
	}

	get schema() {
		if (!this.drizzle_schema) {
			throw new Error('No schema found');
		}
		return this.drizzle_schema;
	}
}

export const app_context = new AppContext();
