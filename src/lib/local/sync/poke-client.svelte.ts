// src/lib/local/sync/poke-client.ts
import { source } from 'sveltekit-sse';
import { store } from '$lib/local/app/store.svelte';
import { sync_client } from './index';
import { isTauri } from '@tauri-apps/api/core';
import log from '$lib/logger.svelte';

const HEARTBEAT_INTERVAL = 10_000;
const STALE_AFTER = HEARTBEAT_INTERVAL * 3; // 30s of silence = dead
const WATCHDOG_TICK = 5_000;

export class ServerConnection {
	#connection: ReturnType<typeof source> | null = null;
	#unsub_hello: (() => void) | null = null;
	#unsub_poke: (() => void) | null = null;
	#unsub_heartbeat: (() => void) | null = null;

	#watchdog: ReturnType<typeof setInterval> | null = null;
	#last_seen = 0;
	#reconnecting = false;

	connected = $state(false);

	private should_connect: boolean = false;
	private is_tauri: boolean = isTauri();

	#touch() {
		this.#last_seen = Date.now();
		this.connected = true;
	}

	async connect() {
		this.should_connect = true;
		if (this.#connection) return;
		if (!store.server_url) return;

		const headers: Record<string, string> = {};
		if (this.is_tauri) {
			const token = await store.getProperty('bearer_token');
			if (token) headers['Authorization'] = `Bearer ${token}`;
		}

		this.#last_seen = Date.now();
		this.#reconnecting = false;

		this.#connection = source(`${store.server_url}/api/v1/sync/events`, {
			headers,
			onclose: async ({ connect }) => {
				this.connected = false;
				if (!this.should_connect) {
					log.sync.info('Poke stream closed (intentional).');
					return; // ← don't reconnect on logout
				}
				log.sync.info('Poke stream closed, reconnecting…');
				setTimeout(connect, 1000);
			}
		});

		const hello = this.#connection.select('hello');
		this.#unsub_hello = hello.subscribe((value) => {
			if (!value) return;
			log.sync.info('Poke stream connected!');
			this.#touch();
			sync_client.sync();
		});

		const heartbeat = this.#connection.select('heartbeat');
		this.#unsub_heartbeat = heartbeat.subscribe((value) => {
			if (!value) return;
			log.sync.debug('heartbeat received');
			this.#touch();
		});

		const poke = this.#connection.select('poke');
		let primed = false;
		this.#unsub_poke = poke.subscribe((value) => {
			if (!primed) {
				primed = true;
				return;
			}
			if (!value) return;
			log.sync.info('Poke received → sync...');
			this.#touch();
			sync_client.sync();
		});

		this.#startWatchdog();
	}

	#startWatchdog() {
		this.#stopWatchdog();
		this.#watchdog = setInterval(() => {
			if (!this.#connection) return;
			if (Date.now() - this.#last_seen < STALE_AFTER) return;

			log.sync.warn('Heartbeat stale → forcing reconnect');
			this.#reconnect();
		}, WATCHDOG_TICK);
	}

	#stopWatchdog() {
		if (this.#watchdog) clearInterval(this.#watchdog);
		this.#watchdog = null;
	}

	#reconnect() {
		if (!this.should_connect) return;
		if (this.#reconnecting) return; // don't stack reconnects
		this.#reconnecting = true;
		this.disconnect();
		setTimeout(() => this.connect(), 500);
	}

	disconnect({ keep_intent = false }: { keep_intent?: boolean } = {}) {
		if (!keep_intent) this.should_connect = false; // logout clears intent
		this.#stopWatchdog();
		this.#unsub_hello?.();
		this.#unsub_poke?.();
		this.#unsub_heartbeat?.();
		this.#unsub_hello = null;
		this.#unsub_poke = null;
		this.#unsub_heartbeat = null;
		this.#connection?.close();
		this.#connection = null;
		this.connected = false;
	}
}

export const server_connection = new ServerConnection();
