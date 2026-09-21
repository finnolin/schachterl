// #lib/local/db/live.svelte.ts
import { createSubscriber } from 'svelte/reactivity';
import { toCompilableQuery } from '@powersync/drizzle-driver';
import type { CommonPowerSyncDatabase } from '@powersync/common';
import { app_context } from '#lib/local/app/app-context.svelte.js';
import { power_sync_db } from '#lib/local/db/index.js';

type DrizzleQuery = Parameters<typeof toCompilableQuery>[0];
type Result<Q extends DrizzleQuery> = Awaited<ReturnType<Q['execute']>>;

/** Watches one compiled query on one database. Internal building block. */
class QueryWatcher<Q extends DrizzleQuery> {
	#data = $state<Result<Q> | undefined>(undefined);
	#loading = $state(true);
	#error = $state<unknown>(null);
	#subscribe: () => void;

	constructor(powersync: CommonPowerSyncDatabase, query: Q) {
		const compiled = toCompilableQuery(query);

		this.#subscribe = createSubscriber(() => {
			const controller = new AbortController();

			const run = async () => {
				try {
					const rows = (await compiled.execute()) as Result<Q>;
					if (controller.signal.aborted) return;
					this.#data = rows;
					this.#error = null;
				} catch (e) {
					if (!controller.signal.aborted) this.#error = e;
				} finally {
					if (!controller.signal.aborted) this.#loading = false;
				}
			};

			(async () => {
				const { sql, parameters } = compiled.compile();
				const tables = await powersync.resolveTables(sql, [...parameters]);
				if (controller.signal.aborted) return;
				await run();
				powersync.onChange(
					{ onChange: run },
					{ tables, signal: controller.signal, throttleMs: 30 }
				);
			})();

			return () => controller.abort();
		});
	}

	get data() {
		this.#subscribe();
		return this.#data;
	}

	get loading() {
		this.#subscribe();
		return this.#loading;
	}

	get error() {
		this.#subscribe();
		return this.#error;
	}
}

/**
 * Reactive live query.
 *
 * - Waits until the local database is open, and rebuilds when it is switched.
 * - `build` runs inside a $derived: reactive values it reads (props, $state)
 *   rebuild the query when they change.
 * - `build` may return null/undefined when there is nothing to query yet.
 * - `build` must return the unawaited drizzle query (no async).
 */
export class LiveQuery<Q extends DrizzleQuery> {
	#build: () => Q | null | undefined;

	#watcher = $derived.by(() => {
		const db = app_context.drizzle_db; // $state: tracks db open/close/switch
		const powersync = power_sync_db;
		if (!db || !powersync) return null;
		const query = this.#build();
		if (!query) return null;
		return new QueryWatcher(powersync, query);
	});

	constructor(build: () => Q | null | undefined) {
		this.#build = build;
	}

	get data() {
		return this.#watcher?.data;
	}

	get loading() {
		return this.#watcher?.loading ?? false;
	}

	get error() {
		return this.#watcher?.error ?? null;
	}
}
