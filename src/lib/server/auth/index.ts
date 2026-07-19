import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import * as tables from '$lib/server/db/schema';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/public';

export const auth = betterAuth({
	baseURL: env.PUBLIC_BASE_URL!,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: tables
	}),

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
