import { json } from '@sveltejs/kit';
import { processBatch, type PushRequest } from '$lib/remote/changes.remote';
export async function POST({ request }) {
	const body: PushRequest = await request.json();
	return json(await processBatch(body));
}
