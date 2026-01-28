import { resolve } from '$app/paths';
import { goto } from '$app/navigation';
import { local_db, DatabaseService } from '$lib/local/db';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { load } from '@tauri-apps/plugin-store';
import { v7 as uuid } from 'uuid';
import log from '$lib/logger.svelte';
import { eq } from 'drizzle-orm';
import { isTauri } from '@tauri-apps/api/core';
import { initializeAuthClient, type AuthClient } from '$lib/local/auth';
import type { Session, User } from 'better-auth';
import * as schema from '$lib/local/db/schema';

type ClientSession = {
	user: User;
	session: Session;
};

export class AppContext {
	private Database: DatabaseService | undefined;
	private drizzle: SqliteRemoteDatabase<typeof schema> | null = $state(null);
	private drizzle_schema = schema;

	is_tauri: boolean = $state(isTauri());
	store: Awaited<ReturnType<typeof load>> | undefined;

	auth_client: AuthClient | undefined;
	session: ClientSession | null = $state(null);

	// app properties:
	client_id: string | undefined = $state();
	server_url: string | undefined = $state();
	auth_token: string | undefined = $state();
	user_id: string | undefined = $state();
	bearer_token: string | undefined = $state();
	sidebar_size: number | undefined = $state();

	async initialize() {
		log.app.debug('Initializing app context...');

		// 1. Initialize store for tauri
		await this.initStore();

		// 2. Client ID:
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
		}
		await this.initializeAuthClient();
	}

	// initialize the tauri store
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
		await this.initializeAuthClient();
	}

	async clearServer() {
		if (!isTauri()) return;
		await this.clearProperty('server_url');
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

	private async initializeAuthClient() {
		let auth_client: AuthClient;
		if (this.is_tauri) {
			if (!this.server_url) return;
			auth_client = initializeAuthClient(this.server_url);
		} else {
			auth_client = initializeAuthClient();
		}
		this.auth_client = auth_client;

		await this.validateSession();
	}

	async validateSession() {
		if (!this.auth_client) return;
		const session = await this.auth_client.getSession();
		log.app.debug('session:', session);
		if (session.error || !session.data) {
			log.app.debug('No session');
			this.session = null;
			await this.validateUser();
			return;
		}
		this.session = session.data;

		log.app.debug('Session OK!');
		await this.validateUser();
	}

	private async validateUser() {
		if (this.session) {
			const user_id = await this.getProperty('user_id');
			if (!user_id) {
				this.setProperty('user_id', this.session.user.id);
			} else if (user_id != this.session.user.id) {
				log.app.warn('User id missmatch');
			}
			log.app.debug('User id OK!');
			this.Database = new DatabaseService(this.user_id!);
			await this.Database.initialize();
			this.drizzle = this.Database.db;
		} else {
			if (!this.user_id) {
				log.app.info('No User ID found');
				goto(resolve('/login'));
			} else {
				log.app.info('No Session but user ID found');
				goto(resolve('/login'));
			}
		}
	}

	async logout() {
		log.app.info('Logging out...');
		const result = await this.auth_client?.signOut();
		if (result?.data?.success) {
			log.app.debug('Logout successful.');
			this.clearProperty('user_id');
			this.clearProperty('bearer_token');
			await this.Database?.destroy();
			this.Database = undefined;
			this.drizzle = null;
			await this.validateSession();
		} else {
			throw new Error('There was a problem logging out.');
		}
	}

	getAuthClient() {
		if (this.auth_client) {
			return this.auth_client;
		}

		// TODO: throw error
		return;
	}

	get auth() {
		if (!this.auth_client) {
			return;
		}
		return this.auth_client;
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
