import { load } from '@tauri-apps/plugin-store';
import { isTauri } from '@tauri-apps/api/core';
import log from '$lib/logger.svelte';

class Store {
	private is_tauri: boolean = false;
	private store: Awaited<ReturnType<typeof load>> | undefined;

	// Properties:
	client_id: string | undefined = $state();
	server_url: string | undefined = $state();
	auth_token: string | undefined = $state();
	user_id: string | undefined = $state();
	bearer_token: string | undefined = $state();
	sidebar_size: number | undefined = $state();

	constructor() {
		this.is_tauri = isTauri();
	}

	// initialize the tauri store
	async initialize() {
		log.store.debug('Initializing store...');
		if (isTauri()) {
			log.store.debug('Loading tauri store...');
			this.store = await load('properties.json', { defaults: {}, autoSave: 100 });
		}
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
			log.store.debug(key, ':', value);
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
		log.store.debug(key, ':', value);
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
}

export const store = new Store();
