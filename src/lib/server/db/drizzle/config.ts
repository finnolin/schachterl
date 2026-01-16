import type { Config } from 'drizzle-kit';

export default {
	schema: './src/lib/server/db/schema.ts', // Full path from project root
	out: './src/lib/server/db/drizzle/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		host: process.env.DB_HOST!,
		port: Number(process.env.DB_PORT!),
		user: process.env.DB_USER!,
		password: process.env.DB_PASSWORD!,
		database: process.env.DB_NAME!,
		...(process.env.DB_SSL_CA && {
			ssl: {
				ca: process.env.DB_SSL_CA
			}
		})
	},
	verbose: true,
	strict: true
} satisfies Config;
