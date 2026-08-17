import type {
	PushRequest,
	PushResponse,
	PullResponse,
	PullRequest
} from '#lib/remote/changes.remote.js';
import { store } from '#lib/local/app/store.svelte.js';
import { app_context } from '../app/app-context.svelte';

type Api = {
	'/api/v1/sync/push': { req: PushRequest; res: PushResponse };
	'/api/v1/sync/pull': { req: PullRequest; res: PullResponse };
};

async function authHeaders(): Promise<HeadersInit> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (app_context.is_tauri) {
		const token = await store.getProperty('bearer_token');
		if (token) headers['Authorization'] = `Bearer ${token}`;
	}
	return headers;
}

export async function apiPost<P extends keyof Api>(
	path: P,
	body: Api[P]['req']
): Promise<Api[P]['res']> {
	const res = await fetch(`${store.server_url}${path}`, {
		method: 'POST',
		credentials: 'include',
		headers: await authHeaders(),
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
	return res.json();
}
