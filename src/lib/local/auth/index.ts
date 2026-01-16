import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/public';
import { isTauri } from '@tauri-apps/api/core';

let auth_client: ReturnType<typeof createAuthClient>;

export function initializeAuthClient(serverUrl?: string) {
	const baseURL = serverUrl || env.PUBLIC_BASE_URL!;

	auth_client = createAuthClient({
		baseURL,
		plugins: [inferAdditionalFields<typeof auth>()],
		fetchOptions: {
			// Store token on successful auth
			onSuccess: (ctx) => {
				if (isTauri()) {
					const authToken = ctx.response.headers.get('set-auth-token');
					if (authToken) {
						localStorage.setItem('bearer_token', authToken);
					}
				}
			},
			// For Tauri: use Bearer token authentication
			...(isTauri() && {
				credentials: 'omit',
				auth: {
					type: 'Bearer',
					token: () => localStorage.getItem('bearer_token') || ''
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
