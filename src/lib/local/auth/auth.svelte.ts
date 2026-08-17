import type { Session, User } from 'better-auth';
import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { isTauri } from '@tauri-apps/api/core';
import { PUBLIC_BASE_URL } from '$app/env/public';
import type { auth as AuthServer } from '#lib/server/auth/index.js';
import { local_db as db } from '#lib/local/db/index.js';
import { store } from '#lib/local/app/store.svelte.js';
import log from '#lib/logger.svelte.js';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { server_connection } from '../sync/poke-client.svelte';

//type ClientSession = NonNullable<Awaited<ReturnType<AuthClient['getSession']>>['data']>;
function makeClient(base_url: string, validateSession: () => Promise<void>) {
	return createAuthClient({
		baseURL: base_url,
		plugins: [inferAdditionalFields<typeof AuthServer>()],
		fetchOptions: {
			onRequest: async (ctx) => {
				const client_id = await store.getProperty('client_id');
				if (client_id) {
					ctx.headers.set('x-client-id', client_id);
				}
				return ctx;
			},
			onSuccess: async (ctx) => {
				if (isTauri()) {
					const bearer_token = ctx.response.headers.get('set-auth-token');

					if (bearer_token) {
						await store.setProperty('bearer_token', bearer_token);
					}
				}

				const url = ctx.request.url.toString();
				if (url.includes('/api/auth/sign-up/') || url.includes('/api/auth/sign-in/')) {
					await validateSession();
				}
			},
			onError: async (ctx) => {
				if (ctx.response.status === 401 && isTauri()) {
					await store.clearProperty('bearer_token');
				}
			},
			...(isTauri()
				? {
						credentials: 'omit' as const,
						auth: {
							type: 'Bearer' as const,
							token: async () => (await store.getProperty('bearer_token')) || ''
						}
					}
				: { credentials: 'include' as const })
		}
	});
}

type AuthClient = ReturnType<typeof makeClient>;
type ClientSession = AuthClient['$Infer']['Session'];
class Auth {
	private is_tauri: boolean = $state(isTauri());
	session: ClientSession | null = $state(null);
	client: AuthClient | null = null;
	user: User | null = null;

	async initialize() {
		if (!store.server_url) {
			log.auth.warn('No server URL set');
			return;
		}
		this.createClient(store.server_url);
		await this.validateSession();
	}

	private createClient(server_url?: string) {
		const base_url = server_url || PUBLIC_BASE_URL!;

		log.auth.debug('Create auth client for server: ', base_url);
		this.client = makeClient(base_url, () => this.validateSession());
	}

	async validateSession() {
		if (!this.client) return;
		const session = await this.client.getSession();
		log.auth.debug('session:', session);
		if (session.error || !session.data) {
			log.auth.debug('No session');
			this.session = null;
			await this.validateUser();
			return;
		}
		this.session = session.data;

		log.auth.debug('Session OK!');
		await this.validateUser();
	}

	private async validateUser() {
		if (!this.session) {
			// no session: stored id or not, go to login
			log.auth.info(store.user_id ? 'No session but user ID found' : 'No user ID found');
			goto(resolve('auth/login'));
			return;
		}

		const authed_id = this.session.user.id;
		this.user = this.session.user;
		const stored_id = await store.getProperty('user_id');
		await store.setProperty('client_id', this.session.session.client_id);

		if (stored_id && stored_id !== authed_id) {
			log.auth.warn('User id mismatch', { stored: stored_id, authed: authed_id });
		}
		if (stored_id !== authed_id) {
			await store.setProperty('user_id', authed_id);
		}

		if (db.user_id !== authed_id) {
			await db.initialize(); // initialize() gets the user_id from store
		}
		log.auth.debug('User + db OK');
		await server_connection.connect();
	}

	async logout() {
		log.auth.info('Logging out...');
		server_connection.disconnect();
		const result = await this.client?.signOut();
		if (result?.data?.success) {
			log.auth.debug('Logout successful.');
			store.clearProperty('user_id');
			store.clearProperty('bearer_token');
			await db.destroy();
			await this.validateSession();
		} else {
			throw new Error('There was a problem logging out.');
		}
	}

	async destroyClient() {
		this.client = null;
	}
}

export const auth = new Auth();
