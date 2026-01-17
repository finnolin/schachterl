import { local_db } from '$lib/local/db';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { load } from '@tauri-apps/plugin-store';
import { v7 as uuid } from 'uuid';
import log from '$lib/logger.svelte';
import { eq } from 'drizzle-orm';
import { isTauri } from '@tauri-apps/api/core';
import { initializeAuthClient } from '$lib/local/auth';
const schema = local_db.schema;

export class AppContext {
	private db: SqliteRemoteDatabase<typeof schema> | null = null;
	is_tauri: boolean = $state(isTauri());
	store: Awaited<ReturnType<typeof load>> | undefined;

	client_id: string | undefined = $state();
	server_url: string | undefined = $state();
	auth_token: string | undefined = $state();
	bearer_token: string | undefined = $state();

	async initialize() {
		log.app.debug('Initializing app context...');

		// Initialize store for tauri
		await this.initStore();

		// Client ID:
		await this.getProperty('client_id');
		if (!this.client_id) {
			log.app.info('Creating new client_id...');
			const client_id = uuid();
			this.setProperty('client_id', client_id);
		}

		if (this.is_tauri) {
			// Server Address:
			await this.getProperty('server_url');

			// Bearer Token:
			await this.getProperty('bearer_token');
			await initializeAuthClient(this.server_url);
		} else {
			await initializeAuthClient();
		}

		this.db = local_db.db;
	}

	async initStore() {
		if (isTauri()) {
			log.app.debug('Initializing Store...');
			this.store = await load('properties.json', { defaults: {}, autoSave: 100 });
		}
	}

	async getProperty<K extends keyof AppContext>(key: K): Promise<AppContext[K] | undefined> {
		let value: AppContext[K] | undefined;

		if (this.is_tauri) {
			if (!this.store) return;
			const property = await this.store.get<{ value: AppContext[K] }>(key);
			value = property?.value;
		} else {
			const stored = localStorage.getItem(key);
			value = stored as AppContext[K];
		}

		if (value !== undefined && value !== null) {
			(this[key] as AppContext[K]) = value;
			log.app.debug(key, ':', value);
		} else {
			log.app.debug('Property', key, 'not found...');
		}

		return value;
	}

	async setProperty<K extends keyof AppContext>(key: K, value: AppContext[K]) {
		if (this.is_tauri) {
			if (!this.store) return;
			await this.store.set(key, { value });
		} else {
			localStorage.setItem(key, String(value));
		}
		(this[key] as AppContext[K]) = value;
		log.app.debug(key, ':', value);
	}

	async clearProperty<K extends keyof AppContext>(key: K) {
		if (this.is_tauri) {
			if (!this.store) return;
			await this.store.delete(key);
		} else {
			localStorage.removeItem(key);
		}
		(this[key] as AppContext[K]) = undefined as AppContext[K];
		log.app.debug(key, 'deleted.');
	}

	async setServer(server_url: string) {
		if (!isTauri()) return;
		await this.setProperty('server_url', server_url);
		await initializeAuthClient(this.server_url);
		log.app.debug('after auth;');
	}

	async clearServer() {
		if (!isTauri()) return;
		await this.clearProperty('server_url');
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
