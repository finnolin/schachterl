// src/lib/local/db/index.ts
import { sqliteService } from './SQLiteService';
import { createCapacitorDrizzle } from './capacitor-drizzle';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { desc, eq } from 'drizzle-orm';
import * as schema from './schema';
import { getMigrations } from './utils';
import journal from './drizzle/migrations/meta/_journal.json';

// example-usage.svelte.ts
import log from '$lib/logger.svelte';
const db_name_default = 'local_db';

class DatabaseService {
	private dbConnection: SQLiteDBConnection | null = null;
	private drizzle_schema = schema;
	private drizzle_db: ReturnType<typeof createCapacitorDrizzle> | null = null;

	async initialize(db_name: string = db_name_default, version: number = 1) {
		try {
			const platform = sqliteService.getPlatform();

			if (platform === 'web') {
				log.db.debug('Platform Web: Initialze Store...');
				await sqliteService.initWebStore();
			}

			this.dbConnection = await sqliteService.openDatabase(db_name, version, false);
			this.drizzle_db = createCapacitorDrizzle(this.dbConnection);

			// Check if database is properly initialized
			await this.checkDB();

			// Check if current schema is applied
			await this.checkSchemaHead();

			if (platform === 'web') {
				await sqliteService.saveToStore(db_name);
			}

			return this.drizzle_db;
		} catch (error) {
			console.error('Database initialization error:', error);
			throw error;
		}
	}

	private async checkDB() {
		if (!this.dbConnection) return;
		log.db.debug('Verifying database...');

		const table_check = await this.dbConnection.query(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
		);
		if (table_check.values && table_check.values.length > 0) {
			log.db.info('Database OK');
			return;
		}
		log.db.warn('System tables not found...');
		await this.prepareDatabase();
	}

	private async prepareDatabase() {
		if (!this.dbConnection) return;
		await this.applyMigrations2();
	}

	private async checkSchemaHead() {
		if (!this.drizzle_db) return;
		log.migrator.debug('Checking schema...');
		const expected_schema_head = journal.entries[journal.entries.length - 1].tag;
		const applied_schema_head = await this.drizzle_db
			.select({ tag: this.schema.drizzle_migrations.tag })
			.from(this.schema.drizzle_migrations)
			.orderBy(desc(this.schema.drizzle_migrations.id))
			.limit(1);

		if (applied_schema_head[0]?.tag === expected_schema_head) {
			log.migrator.info(`Schema up-to-date (head: ${expected_schema_head})`);
			return;
		}
		log.migrator.warn(
			`Schema out-of-date or inconsistent. Expected head: ${expected_schema_head}, ` +
				`applied head: ${applied_schema_head[0]?.tag ?? 'none'}`
		);
		await this.applyMigrations2();
	}
	private async applyMigrations2() {
		if (!this.dbConnection || !this.drizzle_db) return;
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
						await this.dbConnection.execute(statement);
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
		if (this.dbConnection) {
			await sqliteService.closeDatabase(db_name, false);
		}
		this.dbConnection = null;
		this.drizzle_db = null;
	}
}

export const databaseService = new DatabaseService();
