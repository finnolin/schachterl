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
import { PowerSyncService } from '../sync/powersync-service.js';
import { power_sync_db } from '#lib/local/db/index.js';

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
	role: 'admin' | 'user' = $state('user');
	private powersync: PowerSyncService | null = null;

	async initialize() {
		if (!store.server_url) {
			log.auth.warn('No server URL set');
			return;
		}
		this.createClient(store.server_url);
		await this.validateSession();
	}

	createClient(server_url?: string) {
		const base_url = server_url || PUBLIC_BASE_URL!;
		log.auth.debug('Create auth client for server: ', base_url);
		this.client = makeClient(base_url, () => this.validateSession());
	}

	async validateSession() {
		if (!this.client) return;

		try {
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
		} catch (error) {
			log.auth.error('Could not validate session', error);

			// The server may be unavailable. Avoid treating that automatically
			// as a valid "logged out" response unless that is intentional.
		}
	}

	private async validateUser() {
		if (!this.session) {
			// no session: stored id or not, go to login
			const cached_user = store.remote_user_id;
			log.auth.info(cached_user ? 'No session but user ID found' : 'No user ID found');
			goto(resolve('auth/login'));
			return;
		}

		const authed_id = this.session.user.id;
		this.user = this.session.user;
		this.role = this.session.user.role;
		const stored_id = await store.getProperty('remote_user_id');
		await store.setProperty('client_id', this.session.session.client_id);

		if (stored_id && stored_id !== authed_id) {
			log.auth.warn('User id mismatch', { stored: stored_id, authed: authed_id });
		}
		if (stored_id !== authed_id) {
			await store.setProperty('remote_user_id', authed_id);
		}

		const database_changed = db.user_id !== authed_id;
		if (database_changed) {
			await this.powersync?.disconnect();
			this.powersync = null;
			await db.initialize();
		}

		const active_database = power_sync_db;
		if (!active_database) {
			throw new Error('PowerSync database was not initialized');
		}

		if (!this.powersync) {
			this.powersync = new PowerSyncService(
				active_database,
				store.server_url || PUBLIC_BASE_URL!,
				async () => (await store.getProperty('bearer_token')) ?? ''
			);
		}

		log.auth.debug('User + database OK');
		await this.powersync.connect();
	}

	isAdmin(): boolean {
		const mode = store.sync_connection?.mode;
		if (mode === 'local') return true;
		return mode === 'remote' && !!this.client && this.role === 'admin';
	}

	async logout() {
		log.auth.info('Logging out...');

		try {
			await this.client?.signOut();
			log.auth.debug('Remote logout completed.');
		} catch (error) {
			// A remote logout can fail when the server is unavailable. Local
			// credentials must still be cleared in that case.
			log.auth.warn('Remote logout failed; continuing with local logout.', error);
		} finally {
			try {
				await this.powersync?.disconnect();
			} catch (error) {
				log.auth.warn('Could not disconnect PowerSync during logout.', error);
			}
			this.powersync = null;

			await Promise.allSettled([
				store.clearProperty('remote_user_id'),
				store.clearProperty('bearer_token')
			]);

			this.session = null;
			this.user = null;
			this.role = 'user';

			try {
				await db.destroy();
			} catch (error) {
				log.auth.warn('Could not destroy the local database during logout.', error);
			}

			await goto(resolve('auth/login'));
		}
	}

	async destroyClient() {
		this.client = null;
	}
}

export const auth = new Auth();
