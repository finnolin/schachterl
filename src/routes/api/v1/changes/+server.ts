import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Changes, type ChangeQueryOptions } from '$lib/server/repositories/changes';

export const GET: RequestHandler = async ({ url }) => {
	const options: ChangeQueryOptions = {
		cursor: 0
	};
	const changes = await new Changes().getBatch(options);

	return new Response(JSON.stringify(changes), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};

// export const POST: RequestHandler = async ({ locals, request }) => {
// 	// * Get the pushed changes
// 	const changes: ChangeIn[] = await request.json();
// 	console.log(changes);

// 	return new Response(JSON.stringify({ ok: true, message: 'Spaces updated successfully.' }), {
// 		status: 200,
// 		headers: { 'Content-Type': 'application/json' }
// 	});
// };
