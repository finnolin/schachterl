import { redirect } from '@sveltejs/kit';
import { store } from '#lib/local/app/store.svelte.js';

export const load = async () => {
	const sync_connection = store.sync_connection;

	// no connection configured → nothing to authenticate against
	if (!sync_connection) {
		redirect(307, '/settings/server');
	}

	// local mode → auth routes are meaningless
	if (sync_connection.mode === 'local') {
		redirect(307, '/');
	}
};
