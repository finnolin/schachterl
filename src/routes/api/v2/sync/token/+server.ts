import { json } from '@sveltejs/kit';
import { importPKCS8, SignJWT } from 'jose';
import { POWERSYNC_AUDIENCE, POWERSYNC_JWT_KID, POWERSYNC_JWT_PRIVATE_KEY } from '$app/env/private';
import { PUBLIC_POWERSYNC_URL } from '$app/env/public';

const TOKEN_LIFETIME = '1h';

export async function GET({ locals }) {
	if (!locals.session || !locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (!POWERSYNC_AUDIENCE || !POWERSYNC_JWT_KID || !POWERSYNC_JWT_PRIVATE_KEY) {
		return json({ error: 'PowerSync JWT configuration is missing' }, { status: 503 });
	}

	if (!PUBLIC_POWERSYNC_URL) {
		return json({ error: 'PowerSync URL is missing' }, { status: 503 });
	}

	const privateKey = await importPKCS8(
		POWERSYNC_JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
		'RS256'
	);

	const token = await new SignJWT({})
		.setProtectedHeader({ alg: 'RS256', kid: POWERSYNC_JWT_KID })
		.setSubject(locals.session.userId)
		.setAudience(POWERSYNC_AUDIENCE)
		.setIssuedAt()
		.setExpirationTime(TOKEN_LIFETIME)
		.sign(privateKey);

	return json(
		{
			token,
			endpoint: PUBLIC_POWERSYNC_URL,
			expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
		},
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
}
