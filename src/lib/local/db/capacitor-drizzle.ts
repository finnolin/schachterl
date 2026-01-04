import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import * as schema from './schema';
import log from '$lib/logger.svelte';

export function createCapacitorDrizzle(db: SQLiteDBConnection, db_name: string = 'myapp') {
	return drizzle(
		async (sql, params, method) => {
			try {
				if (method === 'run') {
					const result = await db.run(sql, params as any[]);
					return { rows: [] };
				} else if (method === 'all' || method === 'values') {
					const result = await db.query(sql, params as any[]);
					//const result = await db.query('SELECT id FROM users');

					const rows = result.values?.map((row) => Object.values(row)) || [];
					//console.log(rows.length);
					return { rows };
				} else if (method === 'get') {
					const result = await db.query(sql, params as any[]);
					const rows = result.values?.[0] ? [Object.values(result.values[0])] : [];
					return { rows };
				}
				return { rows: [] };
			} catch (error) {
				log.db.error(error);
				throw error;
			}
		},
		{ schema }
	);
}
