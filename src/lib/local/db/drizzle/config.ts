import type { Config } from 'drizzle-kit';

export default {
	schema: './src/lib/local/db/schema.ts', // Full path from project root
	out: './src/lib/local/db/drizzle/migrations',
	dialect: 'sqlite'
} satisfies Config;
