import { readFileSync } from 'node:fs';
import { importJWK, SignJWT } from 'jose';

const jwk = JSON.parse(readFileSync('powersync/dev-private-key.json', 'utf8'));
const key = await importJWK(jwk, 'RS256');

const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'dev-key-1' })
    .setSubject(process.argv[2] ?? 'test-user')
    .setAudience('schachterl')
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(key);

console.log(token);