import { db, schema } from '.';
import { eq } from 'drizzle-orm';
import * as IDs from '#lib/local/utils/ids.js';

export async function seedSystemUser() {
	await db
		.insert(schema.user)
		.values({
			id: IDs.SYSTEM_USER_ID,
			name: 'System',
			email: 'system@localhost', // must satisfy notNull; never used for auth
			email_verified: false,
			role: 'admin',
			created_at: new Date()
		})
		.onConflictDoNothing({ target: schema.user.id });
}

export async function seedBuiltins() {
	for (const type of IDs.BUILTIN_RESOURCE_TYPES) {
		const [existing] = await db
			.select({ id: schema.resource_type.id })
			.from(schema.resource_type)
			.where(eq(schema.resource_type.id, type.id))
			.limit(1);

		if (existing) continue;

		await db.insert(schema.resource_type).values({
			id: type.id,
			key: type.key,
			singular: type.singular,
			plural: type.plural,
			icon: type.icon,
			field_config: [...type.field_config]
		});
	}
}
