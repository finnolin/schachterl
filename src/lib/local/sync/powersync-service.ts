import { invoke } from '@tauri-apps/api/core';
import { PowerSyncDatabase } from '@powersync/web';
import { PowerSyncTauriDatabase } from '@powersync/tauri-plugin';
import type { LocalPowerSyncDb } from '#lib/local/db/index.js';
import { WebPowerSyncConnector } from './powersync-connector.js';

export type BetterAuthTokenProvider = () => Promise<string>;

/**
 * Platform-neutral PowerSync lifecycle.
 *
 * Web uses the JavaScript connector directly. Tauri opens the database in
 * JavaScript but starts synchronization through the native Rust command.
 */
export class PowerSyncService {
	private connected = false;

	constructor(
		private readonly database: LocalPowerSyncDb,
		private readonly server_url: string,
		private readonly better_auth_token: BetterAuthTokenProvider
	) {}

	async connect() {
		if (this.connected) return;

		if (this.database instanceof PowerSyncTauriDatabase) {
			await invoke('connect_powersync', {
				handle: this.database.rustHandle,
				server_url: this.server_url,
				better_auth_token: await this.better_auth_token()
			});
		} else if (this.database instanceof PowerSyncDatabase) {
			await this.database.connect(new WebPowerSyncConnector(this.server_url));
		}

		this.connected = true;
	}

	async disconnect() {
		if (!this.connected) return;

		if (this.database instanceof PowerSyncTauriDatabase) {
			await invoke('disconnect_powersync', {
				handle: this.database.rustHandle
			});
		} else if (this.database instanceof PowerSyncDatabase) {
			await this.database.disconnect();
		}

		this.connected = false;
	}

	async waitForFirstSync() {
		if (this.database instanceof PowerSyncDatabase) {
			await this.database.waitForFirstSync();
		}
	}

	get is_connected() {
		return this.connected;
	}
}
