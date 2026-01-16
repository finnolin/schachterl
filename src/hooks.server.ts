import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import log from '$lib/logger.svelte';
import { env } from '$env/dynamic/public';

//const is_tauri = process.env.TAURI_BUILD === 'true';

const TAURI_ORIGINS = ['http://tauri.localhost', 'https://tauri.localhost', 'tauri://localhost'];

if (env.PUBLIC_DEV_TAURI_ORIGIN && env.PUBLIC_DEV_TAURI_ORIGIN != '') {
	TAURI_ORIGINS.push(env.PUBLIC_DEV_TAURI_ORIGIN);
}

const handleCors: Handle = async ({ event, resolve }) => {
	//const userAgent = event.request.headers.get('user-agent') || '';
	const origin = event.request.headers.get('origin') || '';
	const is_tauri_client = TAURI_ORIGINS.includes(origin);

	if (!is_tauri_client) {
		return resolve(event);
	}
	log.hooks.debug('got request from tauri app');

	const corsEnabledRoutes = ['/api/auth', '/api/public'];

	const shouldEnableCors = corsEnabledRoutes.some((route) => event.url.pathname.startsWith(route));

	if (!shouldEnableCors) {
		return resolve(event);
	}

	// Handle OPTIONS preflight requests
	if (event.request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': event.request.headers.get('origin') || '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Max-Age': '86400'
			}
		});
	}

	const response = await resolve(event);

	// Add CORS headers to all responses
	response.headers.set('Access-Control-Allow-Origin', event.request.headers.get('origin') || '*');
	response.headers.set('Access-Control-Allow-Credentials', 'true');

	return response;
};

const handleAuth: Handle = async ({ event, resolve }) => {
	// if (is_tauri) {
	//     return resolve(event);
	// }
	const token = getAccessToken(event.request);
	if (token) {
		console.log('got token', token);
		// invalid token → optional: return 401 here
		// return new Response("Unauthorized", { status: 401 });
	}
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.session = session?.session;
	log.hooks.debug('handling: ' + event.url.pathname);
	return svelteKitHandler({ event, resolve, auth, building });
};

// Sequence ensures CORS runs first, then auth
export const handle = sequence(handleCors, handleAuth);

function getAccessToken(req: Request) {
	const auth = req.headers.get('authorization');
	if (!auth) return null;
	const [type, token] = auth.split(' ');
	if (type?.toLowerCase() !== 'bearer' || !token) return null;
	return token;
}
