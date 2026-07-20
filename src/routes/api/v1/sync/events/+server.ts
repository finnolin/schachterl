// src/routes/api/v1/sync/events/+server.ts
import { produce } from 'sveltekit-sse';
import { pokeClients } from '$lib/server/poke';

export function POST({ locals }) {
	if (!locals.session) return new Response('unauthorized', { status: 401 });

	const user_id = locals.session.userId;
	const client_id = locals.session.client_id;

	return produce(
		function start({ emit }) {
			console.log('SSE connected', user_id, client_id);
			const conn = { client_id, emit };
			const cleanup = pokeClients.add(user_id, conn);
			return cleanup; // called on disconnect
		},
		{
			stop() {
				// belt-and-suspenders; cleanup above also handles it
			}
		}
	);
}
