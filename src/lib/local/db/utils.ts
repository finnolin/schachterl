interface Migration {
	id: string;
	hash: string;
	sql: string[];
}

export function getMigrations(): Migration[] {
	// Vite will bundle these at build time
	const migration_files = import.meta.glob<string>('./drizzle/migrations/*.sql', {
		eager: true,
		query: '?raw',
		import: 'default'
	});

	return Object.entries(migration_files)
		.map(([path, sql]) => {
			// Extract filename without extension
			const filename = path.split('/').pop()?.replace('.sql', '') || '';

			// Parse SQL into statements
			const statements = sql
				.split(';')
				.map((s) => s.trim())
				.filter((s) => s.length > 0 && !s.startsWith('--'));

			return {
				id: filename,
				hash: filename, // Drizzle uses timestamp_hash format
				sql: statements
			};
		})
		.sort((a, b) => a.id.localeCompare(b.id)); // Sort chronologically
}
