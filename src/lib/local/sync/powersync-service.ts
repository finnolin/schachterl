import { invoke } from '@tauri-apps/api/core';
import { PowerSyncDatabase } from '@powersync/web';
import { PowerSyncTauriDatabase } from '@powersync/tauri-plugin';
import type { LocalPowerSyncDb } from '#lib/local/db/index.js';
import { WebPowerSyncConnector } from './powersync-connector.js';
import { notify } from '#lib/local/utils/invalidation.js';
import type { SyncStreamSubscription } from '@powersync/common';

export type BetterAuthTokenProvider = () => Promise<string>;

/**
 * Platform-neutral PowerSync lifecycle.
 *
 * Web uses the JavaScript connector directly. Tauri opens the database in
 * JavaScript but starts synchronization through the native Rust command.
 */
export class PowerSyncService {
	private connected = false;
	private user_data_subscription: SyncStreamSubscription | null = null;

	constructor(
		private readonly database: LocalPowerSyncDb,
		private readonly server_url: string,
		private readonly better_auth_token: BetterAuthTokenProvider
	) {
		console.log(server_url);
	}

	async connect() {
		if (this.connected) return;

		if (this.database instanceof PowerSyncTauriDatabase) {
			await invoke('connect_powersync', {
				handle: this.database.rustHandle,
				serverUrl: this.server_url,
				betterAuthToken: await this.better_auth_token()
			});
		} else if (this.database instanceof PowerSyncDatabase) {
			await this.database.connect(new WebPowerSyncConnector(this.server_url));
		}

		// Subscribe explicitly so web and Tauri use the same readiness and
		// lifecycle path. The stream is not auto-subscribed in the service config.
		this.user_data_subscription = await this.database.syncStream('user_data').subscribe();

		// LiveQuery currently uses Drizzle for reads. Watch each domain table
		// through PowerSync and invalidate those reads when local or remote data
		// is applied. Separate simple queries are more portable across the web
		// and native SQLite adapters than one query with nested aggregates.
		for (const table of [
			'user',
			'space',
			'space_user',
			'space_resource_type',
			'resource_type',
			'resource',
			'media',
			'relationship_type',
			'relationship'
		]) {
			this.database.watch(`SELECT id FROM ${table}`, [], {
				onResult: () => notify('powersync')
			});
		}

		this.connected = true;
	}

	async disconnect() {
		if (!this.connected) return;

		await this.user_data_subscription?.unsubscribe();
		this.user_data_subscription = null;

		if (this.database instanceof PowerSyncTauriDatabase) {
			await invoke('disconnect_powersync', {
				handle: this.database.rustHandle
			});
		} else if (this.database instanceof PowerSyncDatabase) {
			await this.database.disconnect();
		}

		this.connected = false;
	}

	get is_connected() {
		return this.connected;
	}
}
