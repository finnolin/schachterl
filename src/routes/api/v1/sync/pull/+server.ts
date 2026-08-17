import { json } from '@sveltejs/kit';
import { pullBatch } from '#lib/remote/changes.remote.js';
export async function POST({ request }) {
	return json(await pullBatch(await request.json()));
}
