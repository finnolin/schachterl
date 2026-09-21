import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from '#lib/server/db/index.js';
import { sql, ne, eq } from 'drizzle-orm';
import * as tables from '#lib/server/db/schema.js';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { PUBLIC_BASE_URL } from '$app/env/public';
import { SYSTEM_USER_ID } from '#lib/local/utils/ids.js';

export const auth = betterAuth({
	baseURL: PUBLIC_BASE_URL!,
	database: drizzleAdapter(db, { provider: 'pg', schema: tables }),
	advanced: {
		database: {
			generateId: false // disable automatic ID generation,
		},
		disableOriginCheck: true
	},
	emailAndPassword: {
		enabled: true
	},
	plugins: [bearer(), sveltekitCookies(getRequestEvent)],

	// DB schema adjustments for better-auth
	user: {
		modelName: 'user',
		fields: {
			name: 'name',
			emailVerified: 'email_verified',
			createdAt: 'created_at',
			updatedAt: 'updated_at'
			//banExpires: 'ban_expires',
			//banReason: 'ban_reason'
		},
		additionalFields: {
			role: {
				type: ['admin', 'user'],
				required: true,
				input: false,
				defaultValue: 'user'
			}
			// database_id: {
			// 	type: 'string',
			// 	required: true,
			// 	input: true
			// }
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 14, // 14 days in seconds (default)
		updateAge: 60 * 60 * 24, // Update session every 24 hours
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60 // Cache for 5 minutes
		},
		modelName: 'session',
		fields: {
			userId: 'user_id',
			expiresAt: 'expires_at',
			ipAddress: 'ip_address',
			userAgent: 'user_agent',
			createdAt: 'created_at',
			updatedAt: 'updated_at'
			//impersonatedBy: 'impersonated_by'
		},
		additionalFields: {
			client_id: {
				type: 'string',
				required: true,
				input: true
			}
		}
	},
	account: {
		modelName: 'account',
		fields: {
			userId: 'user_id',
			accountId: 'account_id',
			providerId: 'provider_id',
			accessToken: 'access_token',
			refreshToken: 'refresh_token',
			idToken: 'id_token',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			password: 'password_hash',
			accessTokenExpiresAt: 'access_token_expires',
			refreshTokenExpiresAt: 'refresh_token_expires'
		}
	},
	verification: {
		modelName: 'verification',
		fields: {
			expiresAt: 'expires',
			createdAt: 'created_at',
			updatedAt: 'updated_at'
		}
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const [{ count }] = await db
						.select({ count: sql`count(*)` })
						.from(schema.user)
						.where(ne(schema.user.id, SYSTEM_USER_ID));

					// this user + system user; if it's the only real user, promote
					if (count === 1) {
						await db.update(schema.user).set({ role: 'admin' }).where(eq(schema.user.id, user.id));
					}
				}
			}
		},
		session: {
			create: {
				before: async (session, ctx) => ({
					data: {
						...session,
						client_id: ctx?.headers?.get('x-client-id') ?? 'unknown'
					}
				})
			}
		}
	}
});

export type SessionValidationResult = Awaited<ReturnType<typeof auth.api.getSession>>;
