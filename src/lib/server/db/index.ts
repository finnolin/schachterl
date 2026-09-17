import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { relations } from './relations';
import { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_SSL_CA } from '$app/env/private';

const client = postgres(
	//env.DATABASE_URL,
	{
		database: DB_NAME,
		user: DB_USER,
		password: DB_PASSWORD,
		host: DB_HOST,
		port: Number(DB_PORT),
		...(DB_SSL_CA && { ssl: { ca: DB_SSL_CA } })
	}
);

export const db = drizzle({ client, schema: { ...schema, ...relations } });
export { schema };
export type ServerTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
