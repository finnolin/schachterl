import { json } from '@sveltejs/kit';
import { processBatch } from '$lib/remote/changes.remote';

export async function POST({ request }) {
	const body = await request.json();
	return json(await processBatch(body));
}
