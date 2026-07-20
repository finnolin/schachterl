import { Changes } from '$lib/local/repositories/Changes';
import { app_context } from '$lib/local/app/app-context.svelte';
import { apiPost } from './api';

class SyncClient {
	private batch_size = 2;
	private cursor: number | null = null;

	private syncing = false;
	private rerun = false;

	async sync() {
		if (this.syncing) {
			this.rerun = true;
			return;
		}
		this.syncing = true;
		try {
			do {
				this.rerun = false;
				await this.push();
				// await this.pullChanges(); // next up
			} while (this.rerun);
		} finally {
			this.syncing = false;
		}
	}

	async initialize() {
		const last_cursor = await app_context.getAppMeta('cursor');
		if (last_cursor) {
			this.cursor = Number(last_cursor);
		} else {
			await this.setCursor(0);
		}
		await new Changes().releaseAllInFlight();
	}

	async setCursor(number: number) {
		await app_context.setAppMeta('cursor', number.toString());
		this.cursor = number;
	}

	async push() {
		while (true) {
			const change_repo = new Changes();
			const batch = await change_repo.claimBatch(this.batch_size);
			if (batch.length === 0) break;

			// 2. SEND (never inside a transaction)
			try {
				const { results } = await apiPost('/api/v1/sync/push', batch);
				console.log(results);
				// 3a. process verdicts
				const done_ids: string[] = [];
				for (const result of results) {
					switch (result.status) {
						case 'accepted':
							done_ids.push(result.id);
							break;
						case 'denied_write':
							// FUTURE: overwrite local entity with result.snapshot, rebase, notify UI
							done_ids.push(result.id);
							break;
						case 'denied_read':
							// FUTURE: delete local entity, purge related outbox rows, notify UI
							done_ids.push(result.id);
							break;
					}
				}
				await change_repo.deleteByIds(done_ids);

				// safety net: anything the server didn't answer for gets retried
				const answered = new Set(results.map((r) => r.id));
				const unanswered = batch.filter((c) => !answered.has(c.id)).map((c) => c.seq);
				await change_repo.releaseInFlight(unanswered);
			} catch (error) {
				// 3b. network/server failure: release the claim for retry
				await change_repo.releaseInFlight(batch.map((c) => c.seq));
				console.error('Failed to push batch:', error);
				break;
			}
		}
	}
	async pull() {
		while (true) {
			const { changes, cursor, has_more } = await apiPost('/api/v1/sync/pull', {
				since: this.cursor ?? 0
			});
			if (changes.length === 0) break;
			await new Changes().applyRemote(changes);
			await this.setCursor(cursor);
			if (!has_more) break;
		}
	}
}

export const sync_client = new SyncClient();
