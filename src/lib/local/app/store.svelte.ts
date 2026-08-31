import { load } from '@tauri-apps/plugin-store';
import { isTauri } from '@tauri-apps/api/core';
import log from '#lib/logger.svelte.js';
import { v7 as uuid } from 'uuid';
import { PUBLIC_BASE_URL } from '$app/env/public';

type SyncConnection = undefined | { mode: 'local' } | { mode: 'remote'; endpoint: string };

class Store {
	private is_tauri: boolean = false;
	private store: Awaited<ReturnType<typeof load>> | undefined;

	// Properties:
	client_id: string | undefined = $state();
	server_url: string | undefined = $state();
	auth_token: string | undefined = $state();
	local_user_id: string | undefined = $state();
	remote_user_id: string | undefined = $state();
	//user_id: string | undefined = $state();
	bearer_token: string | undefined = $state();
	sidebar_size: number | undefined = $state();
	sidebar_collapsed: string | undefined = $state();
	sync_connection_target: string | undefined = $state();

	initialized: boolean = $state(false);

	constructor() {
		this.is_tauri = isTauri();
	}

	// initialize the tauri store
	async initialize() {
		log.store.debug('Initializing store...');
		if (isTauri()) {
			log.store.debug('Loading tauri store...');
			this.store = await load('properties.json', { defaults: {}, autoSave: 100 });
		} else {
			log.store.debug('Webapp: Overwriting sync_connection_target + server_url...');
			await this.setProperty('sync_connection_target', PUBLIC_BASE_URL!);
			await this.setProperty('server_url', PUBLIC_BASE_URL!);
		}

		await this.getProperty('server_url');
		await this.getProperty('local_user_id');
		await this.getProperty('remote_user_id');
		// this.getProperty('auth_token');
		// this.getProperty('bearer_token');
		await this.getProperty('sidebar_size');
		await this.getProperty('sidebar_collapsed');
		await this.getProperty('sync_connection_target');
		await this.ensureClientId();
		this.initialized = true;
	}

	async getProperty<K extends keyof Store>(key: K): Promise<Store[K] | undefined> {
		let value: Store[K] | undefined;

		if (this.is_tauri) {
			if (!this.store) return;
			const property = await this.store.get<{ value: Store[K] }>(key);
			value = property?.value;
		} else {
			const stored = localStorage.getItem(key);
			value = stored as Store[K];
		}

		if (value !== undefined && value !== null) {
			(this[key] as Store[K]) = value;
			log.store.debug('get: ', key, ':', value);
		} else {
			log.store.debug('Property', key, 'not found...');
		}

		return value;
	}

	async setProperty<K extends keyof Store>(key: K, value: Store[K]) {
		if (this.is_tauri) {
			if (!this.store) return;
			await this.store.set(key, { value });
		} else {
			localStorage.setItem(key, String(value));
		}
		(this[key] as Store[K]) = value;
		log.store.debug('set: ', key, ':', value);
	}

	async clearProperty<K extends keyof Store>(key: K) {
		if (this.is_tauri) {
			if (!this.store) return;
			await this.store.delete(key);
		} else {
			localStorage.removeItem(key);
		}
		(this[key] as Store[K]) = undefined as Store[K];
		log.store.debug(key, 'deleted.');
	}

	get sync_connection(): SyncConnection {
		const target = this.sync_connection_target;

		if (target === 'local') {
			return { mode: 'local' };
		}

		if (target && /^https?:\/\//.test(target)) {
			return { mode: 'remote', endpoint: target };
		}

		// Backward compatibility while server_url is still in use.
		if (this.server_url && /^https?:\/\//.test(this.server_url)) {
			return { mode: 'remote', endpoint: this.server_url };
		}

		return undefined;
	}

	get user_id(): string | undefined {
		const target = this.sync_connection_target;

		if (target === 'local' && this.local_user_id) {
			console.log('target local', 'user_id', this.local_user_id);
			return this.local_user_id;
		}
		if (target && /^https?:\/\//.test(target) && this.remote_user_id) {
			console.log('target remnote', 'user_id', this.remote_user_id);
			return this.remote_user_id;
		}
		console.log('target undefined');
		return undefined;
	}

	async ensureClientId(): Promise<string> {
		let id = await this.getProperty('client_id');
		if (!id) {
			log.store.info('Creating new client_id...');
			id = uuid();
			await this.setProperty('client_id', id);
		}
		return id;
	}

	async ensureLocalUserId(): Promise<string> {
		let id = await this.getProperty('local_user_id');
		if (!id) {
			id = uuid();
			await this.setProperty('local_user_id', id);
		}
		return id;
	}
}

export const store = new Store();
