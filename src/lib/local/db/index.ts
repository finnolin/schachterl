// src/lib/local/db/index.ts
import { createProxyTauri, createProxySQLocal } from './proxy';
import { desc, eq } from 'drizzle-orm';
import { type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import Database from '@tauri-apps/plugin-sql';
import { isTauri } from '@tauri-apps/api/core';
import { store } from '../app/store.svelte';
import { relations } from './relations';
import { app_context } from '../app/app-context.svelte';
import { BUILTIN_RESOURCE_TYPES } from '#lib/local/utils/ids.js';

import { SQLocal } from 'sqlocal';
import log from '#lib/logger.svelte.js';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';

// ---------------------------------------------------------------------------
// Migration discovery (drizzle-kit v3 layout, no journal.json)
//
// New folder structure:
//   drizzle/migrations/
//     20260716022237_groovy_puma/
//       migration.sql
//       snapshot.json
//
// The folder name starts with a fixed-width timestamp, so lexicographic
// sorting of the folder names yields the correct application order.
// The folder name *is* the tag.
// ---------------------------------------------------------------------------

type MigrationEntry = {
	tag: string;
	sql_content: string;
};

const migration_files = import.meta.glob<string>('./drizzle/migrations/*/migration.sql', {
	eager: true,
	query: '?raw',
	import: 'default'
});

function getMigrationEntries(): MigrationEntry[] {
	return Object.entries(migration_files)
		.map(([path, sql_content]) => {
			// './drizzle/migrations/20260716022237_groovy_puma/migration.sql'
			// -> '20260716022237_groovy_puma'
			const parts = path.split('/');
			const tag = parts[parts.length - 2];
			return { tag, sql_content };
		})
		.sort((a, b) => a.tag.localeCompare(b.tag));
}

async function getTauriDb(db_name_string: string) {
	return await Database.load(db_name_string);
}
function getSQLocalDb(db_name_string: string) {
	return new SQLocal(db_name_string);
}

export class DatabaseService {
	user_id: string | undefined;
	db_string: string | undefined;
	private db_connection: Database | SQLocal | undefined;
	private drizzle_schema = schema;
	private drizzle_db: SqliteRemoteDatabase<typeof relations> | null = null;
	private tx_queue: Promise<unknown> = Promise.resolve();
	private migration_entries: MigrationEntry[] = getMigrationEntries();

	async initialize() {
		const user_id = store.user_id;
		if (!user_id) {
			log.db.error('User ID missing! Cant open DB!');
			return;
		}

		if (this.db_connection && store.user_id != this.user_id) {
			log.db.info('A DB for a different User is already open. Closing...');
			await this.destroy();
		}
		this.user_id = user_id;

		this.db_string = 'sqlite:' + user_id + '.db';
		const db_string = this.db_string;
		log.db.info('Opening Database: ', db_string);
		if (isTauri()) {
			this.db_connection = await getTauriDb(db_string);
			this.drizzle_db = createProxyTauri(db_string);
		} else {
			this.db_connection = getSQLocalDb(db_string);
			this.drizzle_db = createProxySQLocal(db_string);
		}

		try {
			// Check if database is properly initialized
			const system_tables_exist = await this.checkDB();
			if (!system_tables_exist) {
				log.db.warn('System tables not found...');
				await this.applyMigrations();
			} else {
				log.db.info('System tables found.');
			}
			// Check if current schema is applied
			const db_updated = await this.checkSchemaHead();
			if (!db_updated) {
				await this.applyMigrations();
			}

			// for local check if seeds are there
			if (isTauri() && !store.server_url) {
				this.checkSeeds();

				// check if the user exists locally
			}

			// Set in_flight of all changes to false
			await this.drizzle_db.update(schema.change).set({ in_flight: false });
			app_context.setDb(this.drizzle_db);
			//goto(resolve('/app'));
			return this.drizzle_db;
		} catch (error) {
			console.error('Database initialization error:', error);
			throw error;
		}
	}

	private async checkDB() {
		if (!this.drizzle_db) return;
		log.db.debug('Verifying database...');
		if (isTauri()) {
			const sql_db = this.db_connection as Database;
			const query = await sql_db.select<{ name: string }[]>(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
			);
			if (query.length > 0) {
				return true;
			}
		} else {
			const sql_db = this.db_connection as SQLocal;
			const query = await sql_db.sql(
				"SELECT * FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
			);
			if (query.length > 0) {
				return true;
			}
		}
		return false;
	}

	private async executeStatement(statement_string: string) {
		if (isTauri()) {
			const sql_db = this.db_connection as Database;
			await sql_db.execute(statement_string);
		} else {
			const sql_db = this.db_connection as SQLocal;
			await sql_db.sql(statement_string);
		}
	}

	async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
		const run = this.tx_queue.then(async () => {
			await this.executeStatement('BEGIN');
			try {
				const result = await fn();
				await this.executeStatement('COMMIT');
				return result;
			} catch (e) {
				await this.executeStatement('ROLLBACK');
				throw e;
			}
		});
		this.tx_queue = run.catch(() => {});
		return run;
	}

	private async checkSchemaHead() {
		if (!this.drizzle_db) return;
		log.migrator.debug('Checking schema...');
		if (this.migration_entries.length === 0) {
			log.migrator.warn('No migrations found in bundle.');
			return true;
		}
		const expected_schema_head = this.migration_entries[this.migration_entries.length - 1].tag;
		try {
			const applied_schema_head = await this.drizzle_db
				.select({ tag: this.schema.drizzle_migrations.tag })
				.from(this.schema.drizzle_migrations)
				.orderBy(desc(this.schema.drizzle_migrations.id))
				.limit(1);
			if (applied_schema_head[0]?.tag === expected_schema_head) {
				log.migrator.info(`Schema up-to-date (head: ${expected_schema_head})`);
				return true;
			}
			log.migrator.warn(
				`Schema out-of-date or inconsistent. Expected head: ${expected_schema_head}, ` +
					`applied head: ${applied_schema_head[0]?.tag ?? 'none'}`
			);
			return false;
		} catch (error) {
			log.migrator.error(error);
			return false;
		}
	}

	private async checkSeeds() {
		if (!this.drizzle_db) return;
		const db = this.drizzle_db;
		log.migrator.debug('Checking seeds...');
		for (const resource_type of BUILTIN_RESOURCE_TYPES) {
			const [existing] = await db
				.select({ id: schema.resource_type.id })
				.from(schema.resource_type)
				.where(eq(schema.resource_type.id, resource_type.id))
				.limit(1);
			if (existing) continue;
		}
	}

	private async applyMigrations() {
		if (!this.drizzle_db) return;
		for (const migration of this.migration_entries) {
			log.migrator.debug('Processing migration: ' + migration.tag);
			let applied_migration: schema.Migration | undefined;
			try {
				const [result] = await this.drizzle_db
					.select()
					.from(schema.drizzle_migrations)
					.where(eq(schema.drizzle_migrations.tag, migration.tag));
				applied_migration = result;
			} catch (error) {
				log.migrator.warn('Error getting applied migration.');
			}
			if (applied_migration && applied_migration.tag == migration.tag) {
				log.migrator.info(migration.tag, 'already exists.');
				continue;
			}
			const statements = this.splitStatements(migration.sql_content);
			const hash = await this.generateHash(migration.sql_content);
			try {
				for (const statement of statements) {
					if (statement.trim()) {
						log.migrator.debug(`Statement: ${statement.substring(0, 100)}...`);
						await this.executeStatement(statement);
					}
				}
				await this.drizzle_db
					.insert(schema.drizzle_migrations)
					.values({ hash, tag: migration.tag });
			} catch (error) {
				log.migrator.error(error);
				throw error;
			}
			log.migrator.info(migration.tag, 'successfully applied.');
		}
		log.migrator.info('Successfully applied migrations.');
	}

	private splitStatements(sql_content: string): string[] {
		// drizzle still emits '--> statement-breakpoint' markers between
		// statements in migration.sql. If a file has none, split() simply
		// returns the whole file as a single statement, which is fine.
		return sql_content.split('--> statement-breakpoint').map((it) => it.trim());
	}

	private async generateHash(content: string): Promise<string> {
		// For browser environment, use Web Crypto API
		const encoder = new TextEncoder();
		const data = encoder.encode(content);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	get db() {
		if (!this.drizzle_db) {
			throw new Error('Database not initialized. Call initialize() first.');
		}
		return this.drizzle_db;
	}

	get schema() {
		if (!this.drizzle_schema) {
			throw new Error('No schema found');
		}
		return this.drizzle_schema;
	}

	async destroy() {
		const db_string = this.db_string || 'unknown';
		await this.closeDBConnection(db_string);
		this.drizzle_db = null;
		app_context.closeDb();
		this.db_connection = undefined;
		this.user_id = undefined;
	}

	async closeDBConnection(db_string: string) {
		if (!this.db_connection) {
			return;
		}
		log.db.info('Closing database', db_string);
		if (isTauri()) {
			const sql_db = this.db_connection as Database;
			await sql_db.close();
		} else {
			const sql_db = this.db_connection as SQLocal;
			// SQLocal: no explicit close needed here (or use sql_db.destroy() if desired)
		}
	}
}

export const local_db = new DatabaseService();
