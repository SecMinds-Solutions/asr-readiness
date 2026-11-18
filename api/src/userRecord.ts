// The User record: the only data ASR Compas stores about a User, and nothing else.

/** Who the User is, as their access token says. */
export interface UserIdentity {
  homeTenantId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** The User's Contact consent choice and when they made it. */
export interface ContactConsent {
  contactConsent: boolean;
  /** When the User made their Contact consent choice, as an ISO 8601 date-time in UTC. */
  contactConsentDate: string;
}

/** The six fields of the User record; Contact consent with its date counts as one. */
export type UserRecord = UserIdentity & ContactConsent;

/** How a User record is stored in Table Storage: Home tenant and username are the keys. */
export type UserEntity = { partitionKey: string; rowKey: string } & Omit<UserRecord, 'homeTenantId' | 'username'>;

function requiredClaim(claims: Record<string, unknown>, name: string): string {
  const value = claims[name];
  if (typeof value !== 'string' || value === '') throw new Error(`The token has no ${name} claim.`);
  return value;
}

function optionalClaim(claims: Record<string, unknown>, name: string): string {
  const value = claims[name];
  return typeof value === 'string' ? value : '';
}

/** The User's identity from the claims of a validated access token. Throws without a Home tenant or username. */
export function identityFromClaims(claims: Record<string, unknown>): UserIdentity {
  return {
    homeTenantId: requiredClaim(claims, 'tid'),
    username: requiredClaim(claims, 'preferred_username').toLowerCase(),
    firstName: optionalClaim(claims, 'given_name'),
    lastName: optionalClaim(claims, 'family_name'),
    email: optionalClaim(claims, 'email'),
  };
}

/** The row key for a username. Row keys may not contain / \\ # ? or control characters; percent-encoding removes them all. */
export function rowKeyOf(username: string): string {
  return encodeURIComponent(username);
}

export function toEntity({ homeTenantId, username, ...fields }: UserRecord): UserEntity {
  return { partitionKey: homeTenantId, rowKey: rowKeyOf(username), ...fields };
}

export function fromEntity({ partitionKey, rowKey, firstName, lastName, email, contactConsent, contactConsentDate }: UserEntity): UserRecord {
  return {
    homeTenantId: partitionKey,
    username: decodeURIComponent(rowKey),
    firstName,
    lastName,
    email,
    contactConsent,
    contactConsentDate,
  };
}

/** The request body of a Contact consent choice: exactly `{ "contactConsent": true | false }`. */
export function parseContactConsentChoice(body: unknown): boolean | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'contactConsent') return null;
  const { contactConsent } = body as { contactConsent: unknown };
  return typeof contactConsent === 'boolean' ? contactConsent : null;
}
