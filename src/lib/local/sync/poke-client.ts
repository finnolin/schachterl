// src/lib/local/sync/poke-client.ts
import { source } from 'sveltekit-sse';
import { store } from '$lib/local/app/store.svelte';
import { app_context } from '$lib/local/app/app-context.svelte';
import { sync_client } from './index';
import log from '$lib/logger.svelte';

class PokeClient {
	#connection: ReturnType<typeof source> | null = null;
	#unsub: (() => void) | null = null;

	async connect() {
		if (this.#connection) return; // already connected
		if (!store.server_url) return;

		const headers: Record<string, string> = {};
		if (app_context.is_tauri) {
			const token = await store.getProperty('bearer_token');
			if (token) headers['Authorization'] = `Bearer ${token}`;
		}

		this.#connection = source(`${store.server_url}/api/v1/sync/events`, {
			headers,
			async onclose({ connect }) {
				log.app.debug('poke stream closed, reconnecting…');
				setTimeout(connect, 1000);
			}
		});

		const poke = this.#connection.select('poke');
		this.#unsub = poke.subscribe((value) => {
			if (!value) return; // initial empty store value
			log.app.debug('poke received → sync');
			sync_client.sync();
		});
	}

	disconnect() {
		this.#unsub?.();
		this.#unsub = null;
		this.#connection?.close();
		this.#connection = null;
	}
}

export const poke_client = new PokeClient();
