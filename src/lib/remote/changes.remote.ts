import { command, query } from '$app/server';
import { db, schema } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Changes, type ChangeResult, change_in_schema } from '$lib/server/repositories/changes';

//const change_schema = createSelectSchema(local_schema.change);
const batch_schema = z.array(change_in_schema);

export type PushResponse = { results: ChangeResult[] };

export const processBatch = command(batch_schema, async (changes) => {
	const { locals } = getRequestEvent();
	if (!locals.session) {
		error(401, 'Not authenticated');
	}
	console.log('client_id: ', locals.session.client_id);

	const results: ChangeResult[] = [];
	const user_id = locals.session.userId;
	const client_id = locals.session.client_id;
	await db.transaction(async (tx) => {
		// serialize change-log writers → seq order === commit order (the gap fix)
		await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('change_log'))`);
		for (const change of changes) {
			const result = await new Changes().insertChange(tx, change, user_id, client_id);
			results.push(result);
		}
	});

	return { results } satisfies PushResponse;
});

export type PushRequest = Parameters<typeof processBatch>[0]; // { client_id, changes } — inferred from your zod schema

export const pullBatch = command(
	z.object({ since: z.number().int().min(0) }),
	async ({ since }) => {
		const { locals } = getRequestEvent();
		if (!locals.session) error(401, 'Not authenticated');
		return new Changes().getChanges(locals.session.userId, since);
	}
);
export type PullRequest = Parameters<typeof pullBatch>[0]; // { client_id, changes } — inferred from your zod schema
export type PullResponse = Awaited<ReturnType<typeof pullBatch>>;
