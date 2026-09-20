import type {
	CommonPowerSyncDatabase,
	PowerSyncBackendConnector,
	PowerSyncCredentials
} from '@powersync/common';

export class WebPowerSyncConnector implements PowerSyncBackendConnector {
	constructor(private readonly server_url: string) {}

	async fetchCredentials(): Promise<PowerSyncCredentials> {
		const credentials_url = new URL('/api/v2/sync/token', this.server_url);
		const response = await fetch(credentials_url, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch PowerSync credentials: ${response.status}`);
		}

		const credentials = (await response.json()) as Partial<PowerSyncCredentials>;
		if (!credentials.token || !credentials.endpoint) {
			throw new Error('PowerSync credentials response is incomplete');
		}

		return {
			token: credentials.token,
			endpoint: credentials.endpoint
		};
	}

	async uploadData(_database: CommonPowerSyncDatabase): Promise<void> {
		throw new Error('PowerSync upload endpoint is not implemented yet');
	}
}
