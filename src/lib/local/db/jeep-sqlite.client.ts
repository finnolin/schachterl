// src/lib/local/db/jeep-sqlite.client.ts
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { browser } from '$app/environment';

if (browser) {
	jeepSqlite(window);
}
