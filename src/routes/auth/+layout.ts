import { redirect } from '@sveltejs/kit';
import { store } from '#lib/local/app/store.svelte.js';
import { app_context } from '#lib/local/app/app-context.svelte.js';
import { auth } from '#lib/local/auth/auth.svelte.js';

export const load = async () => {
	// no server configured → nothing to authenticate against
	if (!store.server_url) {
		redirect(307, '/settings/server'); // or your local-only home
	}
	// already authenticated → don't show login/register
	if (!auth.client) {
		redirect(307, '/settings/server');
	}
};
