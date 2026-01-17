import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/public';
import { isTauri } from '@tauri-apps/api/core';
import { app_context } from '../app/app-context.svelte';
import log from '$lib/logger.svelte';

let auth_client: ReturnType<typeof createAuthClient>;

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
					const auth_token = ctx.response.headers.get('set-auth-token');
					if (auth_token) {
						//localStorage.setItem('bearer_token', auth_token);
						await app_context.setAppMeta('auth_token', auth_token);
					}
				}
			},
			onError: async (ctx) => {
				if (ctx.response.status === 401 && isTauri()) {
					await app_context.deleteAppMeta('auth_token');
				}
			},
			// For Tauri: use Bearer token authentication
			...(isTauri() && {
				credentials: 'omit',
				auth: {
					type: 'Bearer',
					//token: async () => localStorage.getItem('bearer_token') || ''
					token: async () => (await app_context.getAppMeta('auth_token')) || ''
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
