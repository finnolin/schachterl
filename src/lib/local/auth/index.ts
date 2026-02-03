import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '$lib/server/auth';
import { store } from '../app/store.svelte';

import { env } from '$env/dynamic/public';
import { isTauri } from '@tauri-apps/api/core';
import { app_context } from '../app/app-context.svelte';
import log from '$lib/logger.svelte';

let auth_client: ReturnType<typeof createAuthClient>;
export type AuthClient = ReturnType<typeof initializeAuthClient>;

export function initializeAuthClient(server_url?: string) {
	const base_url = server_url || env.PUBLIC_BASE_URL!;
	log.auth.debug('Create auth client for server: ', base_url);

	auth_client = createAuthClient({
		baseURL: base_url,
		plugins: [inferAdditionalFields<typeof auth>()],
		fetchOptions: {
			// Store token on successful auth
			onSuccess: async (ctx) => {
				if (isTauri()) {
					const bearer_token = ctx.response.headers.get('set-auth-token');
					if (bearer_token) {
						//localStorage.setItem('bearer_token', auth_token);
						await store.setProperty('bearer_token', bearer_token);
						console.log('ctx:', ctx.request);
					}
				}
				if (ctx.request.url.toString().includes('/api/auth/sign-up/')) {
					//await app_context.validateSession();
				}
			},
			onError: async (ctx) => {
				if (ctx.response.status === 401 && isTauri()) {
					console.log('error fetch auth');

					await store.clearProperty('bearer_token');
				}
			},
			// For Tauri: use Bearer token authentication
			...(isTauri() && {
				credentials: 'omit',
				auth: {
					type: 'Bearer',
					//token: async () => localStorage.getItem('bearer_token') || ''
					token: async () => (await store.getProperty('bearer_token')) || ''
				}
			}),
			// For web: use cookies
			...(!isTauri() && {
				credentials: 'include'
			})
		}
	});

	return auth_client;
}

export function getAuthClient() {
	if (!auth_client) {
		throw new Error('Auth client not initialized. Call initializeAuthClient() first.');
	}
	return auth_client;
}

// export const signIn = (...args: any[]) => getAuthClient().signIn(...args);
// export const signUp = (...args: any[]) => getAuthClient().signUp(...args);
export const signOut = () => getAuthClient().signOut();
export const useSession = () => getAuthClient().useSession();

export type Session = ReturnType<ReturnType<typeof getAuthClient>['useSession']>;
