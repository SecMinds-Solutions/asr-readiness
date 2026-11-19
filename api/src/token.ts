import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { GUID } from './guid.js';

/** The delegated scope the app registration exposes for storing the User record. */
export const USER_RECORD_SCOPE = 'UserRecord.ReadWrite';

/** Signing keys of the Microsoft identity platform, for tokens of every tenant. */
export const ENTRA_SIGNING_KEYS: JWTVerifyGetKey = createRemoteJWKSet(
  new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys'),
  { timeoutDuration: 5000 },
);

/** The tenant of personal Microsoft accounts; ASR Compass serves work and school accounts only. */
const CONSUMER_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

export interface VerifyOptions {
  clientId: string;
  keys: JWTVerifyGetKey;
  currentDate?: Date;
}

/**
 * Verifies an Entra ID v2 access token for the app's own API and returns its claims: signature
 * against Microsoft's keys, audience (the app's client ID), issuer (the token's own tenant on
 * login.microsoftonline.com), expiry and not-before, version, the client it was issued to, and
 * the User record scope. Throws on anything else.
 */
export async function verifyAccessToken(token: string, { clientId, keys, currentDate }: VerifyOptions): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, keys, {
    audience: clientId,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iss', 'tid'],
    clockTolerance: 60,
    currentDate,
  });

  const tid = payload['tid'];
  if (typeof tid !== 'string' || !GUID.test(tid) || tid === CONSUMER_TENANT) throw new Error('Invalid tenant.');
  if (payload.iss !== `https://login.microsoftonline.com/${tid}/v2.0`) throw new Error('Invalid issuer.');
  if (payload['ver'] !== '2.0') throw new Error('Not a version 2.0 token.');
  if (payload['azp'] !== clientId) throw new Error('Token issued to another client.');
  const scopes = typeof payload['scp'] === 'string' ? payload['scp'].split(' ') : [];
  if (!scopes.includes(USER_RECORD_SCOPE)) throw new Error('Missing the User record scope.');
  return payload;
}
