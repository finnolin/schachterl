import { defineEnvVars } from '@sveltejs/kit/env';

// @migration-task Review usage of dynamic environment variables. They fall back to the empty string if not present, which may not be what you want.
export const variables = defineEnvVars({
	PUBLIC_DEV_TAURI_ORIGIN: { public: true, schema: (input) => input ?? '' },
	DB_NAME: { schema: (input) => input ?? '' },
	DB_USER: { schema: (input) => input ?? '' },
	DB_PASSWORD: { schema: (input) => input ?? '' },
	DB_HOST: { schema: (input) => input ?? '' },
	DB_PORT: { schema: (input) => input ?? '' },
	DB_SSL_CA: { schema: (input) => input ?? '' },
	PUBLIC_BASE_URL: { public: true, schema: (input) => input ?? '' }
});
