import { local_db, DatabaseService } from '$lib/local/db';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { v7 as uuid } from 'uuid';
import log from '$lib/logger.svelte';
import { eq } from 'drizzle-orm';
import { isTauri } from '@tauri-apps/api/core';
import * as schema from '$lib/local/db/schema';
import { relations } from '$lib/local/db/relations';
import { store } from '$lib/local/app/store.svelte';
import { auth } from '$lib/local/auth/auth.svelte';
import { env } from '$env/dynamic/public';

export class AppContext {
	private Database: DatabaseService = local_db;
	private drizzle_db: SqliteRemoteDatabase<typeof relations> | null = $state(null);
	private drizzle_schema = schema;

	is_tauri: boolean = $state(isTauri());

	async initialize() {
		log.app.debug('Initializing app context...');

		// * 1. Client ID
		log.app.debug('Checking client ID...');
		await store.getProperty('client_id');
		if (!store.client_id) {
			log.app.debug('Creating new client_id...');
			const client_id = uuid();
			await store.setProperty('client_id', client_id);
		}

		// * 2. Set Server URL for web app
		if (!this.is_tauri) {
			log.app.debug('Webapp: Overwriting server_url...');
			await store.setProperty('server_url', env.PUBLIC_BASE_URL!);
		}

		// * 3. If no Server URL exits we can skip auth entirely and immediately initialize the local db
		if (store.server_url) {
			log.app.debug('Server URL set.');
			await this.connectServer();
		} else {
			log.app.debug('No Server URL set. Initialize Local DB with offline user...');
			await this.Database.initialize();
		}
	}

	async setServer(server_url: string) {
		await store.setProperty('server_url', server_url);
		await this.connectServer();
	}

	async connectServer() {
		if (!store.server_url) return;
		if (store.user_id) {
			log.app.debug('Local User ID found... initializing DB...');
			await this.Database.initialize();
		} else {
			log.app.debug('No User ID found... skipping DB init ...');
		}
		await auth.initialize();
	}

	async clearServer() {
		if (!isTauri()) return;
		await store.clearProperty('server_url');
	}

	async getAppMeta(property_name: string) {
		if (!this.drizzle_db) return;
		console.log('get meta', property_name);

		const [property] = await this.drizzle_db
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
		if (!this.drizzle_db) return;
		await this.deleteAppMeta(property_key);
		await this.drizzle_db
			.insert(schema.app_meta)
			.values({ key: property_key, value: property_value });
		log.app.info('Set Meta: ' + property_key + ' / ' + property_value);
	}

	async deleteAppMeta(property_key: string) {
		if (!this.drizzle_db) return;
		await this.drizzle_db.delete(schema.app_meta).where(eq(schema.app_meta.key, property_key));
	}

	setDb(db: SqliteRemoteDatabase<typeof relations>) {
		this.drizzle_db = db;
	}

	get db() {
		if (!this.drizzle_db) {
			throw new Error('Database not initialized. Call initialize() first.');
		}
		return this.drizzle_db;
	}

	get schema() {
		if (!this.drizzle_schema) {
			throw new Error('No schema found');
		}
		return this.drizzle_schema;
	}
}

export const app_context = new AppContext();
