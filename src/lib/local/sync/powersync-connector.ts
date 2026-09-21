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

	async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
		for await (const transaction of database.getCrudTransactions()) {
			const response = await fetch(new URL('/api/v2/sync/upload', this.server_url), {
				method: 'POST',
				credentials: 'include',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					batch: transaction.crud.map(({ op, table, id, opData }) => ({
						op,
						table,
						id,
						...(opData === undefined ? {} : { data: opData })
					}))
				})
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`PowerSync upload failed (${response.status}): ${error}`);
			}

			const result = (await response.json()) as {
				rejected?: Array<{ id: string; table: string; op: string; reason: string }>;
			};
			if (result.rejected?.length) {
				console.warn('[PowerSync] rejected upload operations', result.rejected);
			}

			await transaction.complete();
		}
	}
}
