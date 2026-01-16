import { drizzle } from 'drizzle-orm/sqlite-proxy';
import Database from '@tauri-apps/plugin-sql';
import { SQLocalDrizzle } from 'sqlocal/drizzle';
import * as schema from './schema';
import log from '$lib/logger.svelte';

async function getTauriDb(db_name: string) {
	return await Database.load(db_name);
}

export function createProxyTauri(db_name: string) {
	return drizzle<typeof schema>(
		async (sql, params, method) => {
			const sqlite = await getTauriDb(db_name);
			let rows: any = [];
			let results = [];
			log.db.debug(sql);
			// If the query is a SELECT, use the select method
			if (isSelectQuery(sql)) {
				rows = await sqlite.select(sql, params).catch((e) => {
					log.db.error('SQL Error:', e);
					return [];
				});
			} else {
				// Otherwise, use the execute method
				rows = await sqlite.execute(sql, params).catch((e) => {
					log.db.error('SQL Error:', e);
					return [];
				});
				return { rows: [] };
			}

			rows = rows.map((row: any) => {
				return Object.values(row);
			});

			// If the method is "all", return all rows
			results = method === 'all' ? rows : rows[0];
			//await sqlite.close();
			return { rows: results };
		},
		// Pass the schema to the drizzle instance
		{ schema: schema }
	);
}

export function createProxySQLocal(db_name: string) {
	const { driver, batchDriver } = new SQLocalDrizzle(db_name);
	return drizzle(driver, batchDriver, { schema: schema });
}

function isSelectQuery(sql: string): boolean {
	const selectRegex = /^\s*SELECT\b/i;
	return selectRegex.test(sql);
}
