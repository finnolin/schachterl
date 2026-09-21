import { importPKCS8, SignJWT } from 'jose';

process.loadEnvFile('.env');

const privateKeyPem = process.env.POWERSYNC_JWT_PRIVATE_KEY;
const kid = process.env.POWERSYNC_JWT_KID;
const audience = process.env.POWERSYNC_AUDIENCE;

if (!privateKeyPem || !kid || !audience) {
    throw new Error('POWERSYNC_AUDIENCE, POWERSYNC_JWT_KID and POWERSYNC_JWT_PRIVATE_KEY are required in .env');
}

const key = await importPKCS8(privateKeyPem.replace(/\\n/g, '\n'), 'RS256');

const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid })
    .setSubject(process.argv[2] ?? 'test-user')
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(key);

// Emit only the JWT. `console.log` adds a newline, and some terminal copy
// operations can preserve wrapped output as literal line breaks.
process.stdout.write(token);