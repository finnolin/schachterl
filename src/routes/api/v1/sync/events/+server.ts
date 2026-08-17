// src/routes/api/v1/sync/events/+server.ts
import { produce } from 'sveltekit-sse';
import { pokeClients } from '#lib/server/poke/index.js';
import log from '#lib/logger.svelte.js';

export function POST({ locals }) {
	if (!locals.session) return new Response('unauthorized', { status: 401 });

	const user_id = locals.session.userId;
	const client_id = locals.session.client_id;

	return produce(
		function start({ emit }) {
			log.sync.info('SSE connected', user_id, client_id);
			emit('hello', '1');

			const heartbeat = setInterval(() => {
				const { error } = emit('heartbeat', String(Date.now()));
				if (error) clearInterval(heartbeat);
			}, 10_000);

			const conn = { client_id, emit };
			const remove = pokeClients.add(user_id, conn);

			return function stop() {
				log.sync.debug('Stopping connection...');
				clearInterval(heartbeat);
				remove();
			};
		},
		{
			ping: 10_000,
			stop() {
				log.sync.info('Client disconnected.');
			}
		} // keep: still useful as raw keepalive traffic for proxies
	);
}
