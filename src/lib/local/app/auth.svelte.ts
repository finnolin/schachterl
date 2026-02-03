import type { Session, User } from 'better-auth';
import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { isTauri } from '@tauri-apps/api/core';
import { env } from '$env/dynamic/public';
import type { auth as AuthServer } from '$lib/server/auth';
import { local_db as db } from '$lib/local/db';
import { store } from '$lib/local/app/store.svelte';
import log from '$lib/logger.svelte';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
type ClientSession = {
	user: User;
	session: Session;
};
type AuthClient = ReturnType<typeof createAuthClient>;

class Auth {
	private is_tauri: boolean = $state(isTauri());
	session: ClientSession | null = $state(null);
	client: AuthClient | null = null;

	async initialize() {
		if (this.is_tauri) {
			if (!store.server_url) return;
			this.createClient(store.server_url);
		} else {
			this.createClient();
		}
		await this.validateSession();
	}

	private createClient(server_url?: string) {
		const base_url = server_url || env.PUBLIC_BASE_URL!;
		log.auth.debug('Create auth client for server: ', base_url);

		this.client = createAuthClient({
			baseURL: base_url,
			plugins: [inferAdditionalFields<typeof AuthServer>()],
			fetchOptions: {
				onSuccess: async (ctx) => {
					if (isTauri()) {
						const bearer_token = ctx.response.headers.get('set-auth-token');

						if (bearer_token) {
							await store.setProperty('bearer_token', bearer_token);
						}
					}

					if (ctx.request.url.toString().includes('/api/auth/sign-up/')) {
						await this.validateSession();
					}
				},
				onError: async (ctx) => {
					if (ctx.response.status === 401 && isTauri()) {
						await store.clearProperty('bearer_token');
					}
				},
				...(isTauri() && {
					credentials: 'omit',
					auth: {
						type: 'Bearer',
						token: async () => (await store.getProperty('bearer_token')) || ''
					}
				}),
				...(!isTauri() && {
					credentials: 'include'
				})
			}
		});
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

		log.app.debug('Session OK!');
		await this.validateUser();
	}

	private async validateUser() {
		if (this.session) {
			const user_id = await store.getProperty('user_id');
			if (!user_id) {
				store.setProperty('user_id', this.session.user.id);
			} else if (user_id != this.session.user.id) {
				log.auth.warn('User id missmatch');
			}
			log.app.debug('User id OK!');
			// this.Database = new DatabaseService(store.user_id!);
			// await this.Database.initialize();
			// this.drizzle = this.Database.db;
			await db.initialize(store.user_id!);
		} else {
			if (!store.user_id) {
				log.auth.info('No User ID found');
				goto(resolve('/login'));
			} else {
				log.auth.info('No Session but user ID found');
				goto(resolve('/login'));
			}
		}
	}

	async logout() {
		log.auth.info('Logging out...');
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
}

export const auth = new Auth();
