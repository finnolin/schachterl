import { isTauri } from '@tauri-apps/api/core';
import { appDataDir } from '@tauri-apps/api/path';
import { PowerSyncDatabase } from '@powersync/web';
import { PowerSyncTauriDatabase } from '@powersync/tauri-plugin';
import {
	DrizzleAppSchema,
	wrapPowerSyncWithDrizzle,
	type PowerSyncSQLiteDatabase
} from '@powersync/drizzle-driver';
import { store } from '../app/store.svelte.js';
import * as schema from './schema.js';
import { relations } from './relations.js';
import log from '#lib/logger.svelte.js';

/**
 * The synced tables are generated from the complete domain Drizzle schema.
 * Legacy outbox/meta tables remain local-only during the transition away from
 * the custom sync layer.
 */
const power_sync_schema = new DrizzleAppSchema({
	user: schema.user,
	space: schema.space,
	space_user: schema.space_user,
	space_resource_type: schema.space_resource_type,
	resource_type: schema.resource_type,
	resource: schema.resource,
	media: schema.media,
	relationship_type: schema.relationship_type,
	relationship: schema.relationship,
	app_meta: { tableDefinition: schema.app_meta, options: { localOnly: true } },
	change: { tableDefinition: schema.change, options: { localOnly: true } }
});

export type LocalDrizzleDb = PowerSyncSQLiteDatabase<typeof relations>;
export type LocalPowerSyncDb = PowerSyncDatabase | PowerSyncTauriDatabase;

export let power_sync_db: LocalPowerSyncDb | null = null;
export let db: LocalDrizzleDb | null = null;

function getDatabaseFilename(user_id: string) {
	return `schachterl-${user_id}.sqlite`;
}

function createPowerSyncDatabase(user_id: string): LocalPowerSyncDb {
	const database = {
		dbFilename: getDatabaseFilename(user_id)
	};

	if (isTauri()) {
		return new PowerSyncTauriDatabase({
			database: {
				...database,
				dbLocationAsync: appDataDir
			},
			schema: power_sync_schema
		});
	}

	return new PowerSyncDatabase({
		database: {
			...database,
			useWebWorker: true,
			enableMultiTabs: true
		},
		schema: power_sync_schema
	});
}

export class DatabaseService {
	user_id: string | undefined;
	db_string: string | undefined;
	private drizzle_db: LocalDrizzleDb | null = null;

	async initialize() {
		const user_id = store.user_id;
		if (!user_id) {
			log.db.error('User ID missing! Cannot open PowerSync database.');
			return;
		}

		if (power_sync_db && this.user_id !== user_id) {
			log.db.info('Switching PowerSync databases for a different user.');
			await this.destroy();
		}

		if (power_sync_db && this.user_id === user_id && this.drizzle_db) {
			return this.drizzle_db;
		}

		this.user_id = user_id;
		this.db_string = `sqlite:${getDatabaseFilename(user_id)}`;
		log.db.info('Opening PowerSync database:', this.db_string);

		power_sync_db = createPowerSyncDatabase(user_id);
		await power_sync_db.init();

		// The Drizzle wrapper is queryable immediately after init(). Sync
		// connection/authentication is intentionally managed separately.
		db = wrapPowerSyncWithDrizzle(power_sync_db, { schema: relations });
		this.drizzle_db = db;

		const { app_context } = await import('../app/app-context.svelte.js');
		app_context.setDb(this.drizzle_db);

		return this.drizzle_db;
	}

	get db() {
		if (!this.drizzle_db) {
			throw new Error('Database not initialized. Call initialize() first.');
		}
		return this.drizzle_db;
	}

	get schema() {
		return schema;
	}

	async destroy() {
		if (power_sync_db) {
			log.db.info('Closing PowerSync database:', this.db_string ?? 'unknown');
			await power_sync_db.disconnect();
			await power_sync_db.close();
		}

		power_sync_db = null;
		db = null;
		this.drizzle_db = null;
		this.user_id = undefined;
		this.db_string = undefined;

		const { app_context } = await import('../app/app-context.svelte.js');
		app_context.closeDb();
	}
}

export const local_db = new DatabaseService();

export { power_sync_schema as ps_schema };
