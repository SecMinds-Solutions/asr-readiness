import { identityFromClaims, parseContactConsentChoice, type ContactConsent, type UserIdentity, type UserRecord } from './userRecord.js';

/** Reads and writes User records. */
export interface UserStore {
  get(homeTenantId: string, username: string): Promise<UserRecord | null>;
  save(record: UserRecord): Promise<void>;
}

export interface UserRequest {
  method: string;
  authorization: string | null;
  json(): Promise<unknown>;
}

export interface UserResponse {
  status: number;
  jsonBody?: ContactConsent | { error: string };
  headers?: Record<string, string>;
}

export interface UserHandlerDeps {
  store: UserStore;
  now(): Date;
  /** Verifies the access token and returns its claims; throws when it is not valid. */
  verify(token: string): Promise<Record<string, unknown>>;
}

const unauthorized: UserResponse = {
  status: 401,
  jsonBody: { error: 'A valid access token is required.' },
  headers: { 'WWW-Authenticate': 'Bearer' },
};

function bearerToken(authorization: string | null): string | null {
  const match = /^Bearer (\S+)$/.exec(authorization ?? '');
  return match?.[1] ?? null;
}

function consentOf({ contactConsent, contactConsentDate }: UserRecord): UserResponse {
  return { status: 200, jsonBody: { contactConsent, contactConsentDate } };
}

/**
 * GET returns the signed-in User's Contact consent, or 404 for a User without a record.
 * PUT stores their record: every field from the validated token, plus the Contact consent choice,
 * which is the only thing the request body may contain. Storage errors are passed on.
 */
export async function handleUserRequest(request: UserRequest, { store, now, verify }: UserHandlerDeps): Promise<UserResponse> {
  if (request.method !== 'GET' && request.method !== 'PUT') return { status: 405, headers: { Allow: 'GET, PUT' } };

  const token = bearerToken(request.authorization);
  if (!token) return unauthorized;
  let claims: Record<string, unknown>;
  try {
    claims = await verify(token);
  } catch {
    return unauthorized;
  }

  let identity: UserIdentity;
  try {
    identity = identityFromClaims(claims);
  } catch {
    return unauthorized;
  }

  if (request.method === 'GET') {
    const stored = await store.get(identity.homeTenantId, identity.username);
    return stored ? consentOf(stored) : { status: 404, jsonBody: { error: 'No User record yet.' } };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  const contactConsent = parseContactConsentChoice(body);
  if (contactConsent === null) return { status: 400, jsonBody: { error: 'The body must be {"contactConsent": true|false}.' } };

  const record: UserRecord = { ...identity, contactConsent, contactConsentDate: now().toISOString() };
  await store.save(record);
  return consentOf(record);
}
