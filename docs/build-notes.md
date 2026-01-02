### sql-wasm.wasm

This file is generated at build time and intentionally ignored in git.

It is required **only for web builds**, where SQLite runs via WebAssembly (`sql.js`) backed by IndexedDB.
Native Capacitor builds use real SQLite and do not need this file.

#### Related package scripts

```json
{
	"scripts": {
		// Required for browser builds:
		// SQLite runs via WASM + IndexedDB on the web
		// copyfiles: Cross-platform file copying utility
		// -u 3 flag strips the first 3 path segments (node_modules/sql.js/dist)
		"copy:sql:wasm": "copyfiles -u 3 node_modules/sql.js/dist/sql-wasm.wasm static/assets",

		// Native apps use real SQLite, so remove the WASM
		// rimraf: Cross-platform file/directory deletion utility (like rm -rf)
		"remove:sql:wasm": "rimraf static/assets/sql-wasm.wasm",

		"dev": "npm run copy:sql:wasm && vite dev",
		"build:native": "npm run remove:sql:wasm && vite build"
	}
}
```
