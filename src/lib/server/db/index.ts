import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const client = postgres(
	//env.DATABASE_URL,
	{
		database: env.DB_NAME,
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		host: env.DB_HOST,
		port: Number(env.DB_PORT),
		...(env.DB_SSL_CA && {
			ssl: {
				ca: env.DB_SSL_CA
			}
		})
	}
);

export const db = drizzle(client, { schema });
