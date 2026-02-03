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
			log.db.debug(sql);

			const isSelect = isSelectQuery(sql);
			const returning = /\breturning\b/i.test(sql);

			let rows: any[] = [];

			try {
				if (isSelect || returning) {
					// SELECT or INSERT/UPDATE/DELETE ... RETURNING
					const result = await sqlite.select<any[]>(sql, params);
					rows = result.map((row) => Object.values(row));
				} else {
					// Plain write query
					await sqlite.execute(sql, params);
					return { rows: [] };
				}
			} catch (e) {
				log.db.error('SQL Error:', e);
				return { rows: [] };
			}

			const results = method === 'all' ? rows : rows[0];

			return { rows: results };
		},
		{ schema }
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
