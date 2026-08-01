import { db, schema } from '.';
import { Changes, type Change } from '../repositories/changes';
import { eq } from 'drizzle-orm';
import * as IDs from '$lib/local/utils/ids';
import { type BUILTIN_RESOURCE_TYPES } from '$lib/local/utils/ids';

export async function seedSystemUser() {
	await db
		.insert(schema.user)
		.values({
			id: IDs.SYSTEM_USER_ID,
			name: 'System',
			email: 'system@localhost', // must satisfy notNull; never used for auth
			email_verified: false,
			role: 'admin', // so its changes pass the admin gate naturally
			created_at: new Date()
		})
		.onConflictDoNothing({ target: schema.user.id });
}

export async function seedBuiltins() {
	const changes = new Changes();

	for (const type of IDs.BUILTIN_RESOURCE_TYPES) {
		const [existing] = await db
			.select({ id: schema.resource_type.id })
			.from(schema.resource_type)
			.where(eq(schema.resource_type.id, type.id))
			.limit(1);

		if (existing) continue;

		const change: Change = {
			id: crypto.randomUUID(),
			entity_type: 'resource_type',
			entity_id: type.id,
			op: 'create',
			patch: type,
			base_version: 0,
			created_at: new Date()
		};

		await db.transaction((tx) =>
			changes.insertChange(tx, change, IDs.SYSTEM_USER_ID, IDs.SYSTEM_CLIENT_ID, 'admin')
		);
	}
}
