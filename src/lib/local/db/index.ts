// src/lib/local/db/index.ts
import { createProxyTauri, createProxySQLocal } from './proxy';
import { desc, eq } from 'drizzle-orm';
import { type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import Database from '@tauri-apps/plugin-sql';
import { isTauri } from '@tauri-apps/api/core';

import { SQLocal } from 'sqlocal';
import { getMigrations } from './utils';
import journal from './drizzle/migrations/meta/_journal.json';

// example-usage.svelte.ts
import log from '$lib/logger.svelte';
const db_name_default = 'local';
const db_name_string = 'sqlite:' + db_name_default + '.db';

async function getTauriDb(db_name: string = db_name_default) {
	return await Database.load(db_name_string);
}
function getSQLocalDb(db_name: string = db_name_default) {
	return new SQLocal(db_name_string);
}

class DatabaseService {
	private db_connection: Database | SQLocal | undefined;
	private drizzle_schema = schema;
	private drizzle_db: SqliteRemoteDatabase<typeof schema> | null = null;

	async initialize(db_name: string = db_name_default) {
		if (isTauri()) {
			console.log('is tauri');
			this.db_connection = await getTauriDb();
			this.drizzle_db = createProxyTauri(db_name_string);
		} else {
			this.db_connection = getSQLocalDb();
			this.drizzle_db = createProxySQLocal(db_name_string);
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
			//const sql_db = await getTauriDb();
			const query = await sql_db.select<{ name: string }[]>(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
			);
			console.log(query);

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
		// const table_check = await this.db_connection?.execute(
		// 	"SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
		// );
		// if (table_check.values && table_check.values.length > 0) {
		// 	log.db.info('Database OK');
		// 	return;
		// }
		//log.db.warn('System tables not found...');
		//await this.prepareDatabase();
	}

	private async prepareDatabase() {
		// if (!this.dbConnection) return;
		// await this.applyMigrations2();
	}

	private async executeStatement(statement_string: string) {
		if (isTauri()) {
			console.log('Connection object:', this.db_connection);
			console.log(
				'Connection methods:',
				Object.getOwnPropertyNames(Object.getPrototypeOf(this.db_connection))
			);
			const sql_db = this.db_connection as Database;
			//const sql_db = await getTauriDb();
			await sql_db.execute(statement_string);
		} else {
			console.log('test');

			const sql_db = this.db_connection as SQLocal;
			const query = await sql_db.sql(statement_string);
			console.log(query);

			if (query.length > 0) {
				return true;
			}
		}
	}

	private async checkSchemaHead() {
		if (!this.drizzle_db) return;
		log.migrator.debug('Checking schema...');
		const expected_schema_head = journal.entries[journal.entries.length - 1].tag;
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
	private async applyMigrations() {
		if (!this.drizzle_db) return;
		for (const migration of journal.entries) {
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
				//throw error;
			}
			if (applied_migration && applied_migration.tag == migration.tag) {
				log.migrator.info(migration.tag, 'already exists.');
				continue;
			}
			const drizzle_migration = await this.getSQLStatements(migration.tag);
			try {
				for (const statement of drizzle_migration.sql) {
					if (statement.trim()) {
						log.migrator.debug(`Statement: ${statement.substring(0, 100)}...`);
						await this.executeStatement(statement);
					}
				}
				await this.drizzle_db
					.insert(schema.drizzle_migrations)
					.values({ hash: drizzle_migration.hash, tag: migration.tag });
			} catch (error) {
				log.migrator.error(error);
				throw error;
			}
			log.migrator.info(migration.tag, 'successfully applied.');
		}
		log.migrator.info('Successfully applied migrations.');
	}

	private async getSQLStatements(tag: string) {
		// Import all SQL files upfront with a static glob pattern
		const migrationFiles = import.meta.glob<string>('./drizzle/migrations/*.sql', {
			eager: true,
			query: '?raw',
			import: 'default'
		});

		// Find the specific file by tag
		const fileName = `./drizzle/migrations/${tag}.sql`;
		const fileContent = migrationFiles[fileName];

		if (!fileContent) {
			throw new Error(`No file ${tag}.sql found in migrations folder`);
		}

		// Split by statement breakpoint, same as the original migrator
		const statements = fileContent.split('--> statement-breakpoint').map((it) => it.trim());

		// Generate hash like the original
		const hash = await this.generateHash(fileContent);

		return {
			sql: statements,
			hash
		};
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

	async close(db_name: string = db_name_default) {
		// if (this.dbConnection) {
		// 	await sqliteService.closeDatabase(db_name, false);
		// }
		// this.dbConnection = null;
		// this.drizzle_db = null;
	}
}

export const local_db = new DatabaseService();
