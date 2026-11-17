import type { webcrypto } from 'node:crypto';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK, type JWTPayload } from 'jose';
import { USER_RECORD_SCOPE, verifyAccessToken } from './token.js';

const clientId = '0b5c3a1e-7d2f-4c8a-9e6b-1f2a3b4c5d6e';
const tid = '11111111-1111-1111-1111-111111111111';
const now = new Date('2026-11-17T10:00:00Z');
const seconds = Math.floor(now.getTime() / 1000);

let privateKey: webcrypto.CryptoKey;
let otherKey: webcrypto.CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair('RS256')).privateKey;
  const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'key-1', alg: 'RS256' };
  keys = createLocalJWKSet({ keys: [jwk] });
});

function validClaims(): JWTPayload & Record<string, unknown> {
  return {
    aud: clientId,
    iss: `https://login.microsoftonline.com/${tid}/v2.0`,
    iat: seconds - 60,
    nbf: seconds - 60,
    exp: seconds + 3600,
    tid,
    ver: '2.0',
    azp: clientId,
    scp: USER_RECORD_SCOPE,
    preferred_username: 'ada@contoso.com',
  };
}

async function sign(claims: JWTPayload, key: webcrypto.CryptoKey = privateKey, alg = 'RS256') {
  return new SignJWT(claims).setProtectedHeader({ alg, kid: 'key-1', typ: 'JWT' }).sign(key);
}

const verify = (token: string) => verifyAccessToken(token, { clientId, keys, currentDate: now });

describe('verifyAccessToken', () => {
  it('returns the claims of a valid access token for the User record scope', async () => {
    await expect(verify(await sign(validClaims()))).resolves.toMatchObject({ tid, preferred_username: 'ada@contoso.com' });
  });

  it('accepts the scope among other scopes', async () => {
    await expect(verify(await sign({ ...validClaims(), scp: `openid ${USER_RECORD_SCOPE}` }))).resolves.toBeTruthy();
  });

  it.each<[string, Record<string, unknown>]>([
    ['another audience', { aud: '99999999-9999-9999-9999-999999999999' }],
    ['the api:// audience of a version 1 token', { aud: `api://${clientId}` }],
    ['an issuer for another tenant', { iss: 'https://login.microsoftonline.com/22222222-2222-2222-2222-222222222222/v2.0' }],
    ['an issuer outside Microsoft', { iss: `https://evil.example.com/${tid}/v2.0` }],
    ['an expired token', { exp: seconds - 600, iat: seconds - 4000, nbf: seconds - 4000 }],
    ['a token that is not valid yet', { nbf: seconds + 600 }],
    ['a token without expiry', { exp: undefined }],
    ['a version 1 token', { ver: '1.0' }],
    ['a token issued to another client', { azp: '99999999-9999-9999-9999-999999999999' }],
    ['a token without the User record scope', { scp: 'User.Read' }],
    ['an application token without scopes', { scp: undefined, roles: ['UserRecord.ReadWrite'] }],
    ['a personal Microsoft account', {
      tid: '9188040d-6c67-4c5b-b112-36a304b66dad',
      iss: 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0',
    }],
    ['a tenant ID that is not a GUID', { tid: 'common', iss: 'https://login.microsoftonline.com/common/v2.0' }],
  ])('rejects %s', async (_, override) => {
    await expect(verify(await sign({ ...validClaims(), ...override }))).rejects.toThrow();
  });

  it('rejects a token signed with another key', async () => {
    await expect(verify(await sign(validClaims(), otherKey))).rejects.toThrow();
  });

  it('rejects an unsigned token', async () => {
    const payload = (await sign(validClaims())).split('.')[1];
    const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${payload}.`;
    await expect(verify(unsigned)).rejects.toThrow();
  });

  it('rejects something that is not a token', async () => {
    await expect(verify('not-a-token')).rejects.toThrow();
  });
});
