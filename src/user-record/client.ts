/** The signed-in User's stored User record, as the API returns it to them. */
export interface UserRecord {
  homeTenantId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  contactConsent: boolean;
  /** When the User made their latest Contact consent choice, as an ISO 8601 date-time in UTC. */
  contactConsentDate: string;
}

/** Reads, stores and deletes the signed-in User's record through the app's own API. */
export interface UserRecordClient {
  /** The stored User record, or null when the User has no record yet. */
  userRecord(): Promise<UserRecord | null>;
  /** Stores a Contact consent choice, also to withdraw it; the API dates it. */
  saveContactConsent(contactConsent: boolean): Promise<UserRecord>;
  /** Deletes the User record; resolves only once the API confirms it is gone. */
  deleteUserRecord(): Promise<void>;
  /** Every User record, for SecMinds admins only; the API decides who is one. */
  listUserRecords(): Promise<UserRecordList>;
}

export type UserRecordList = { status: 'allowed'; users: UserRecord[] } | { status: 'not-allowed' };

const DEFAULT_TIMEOUT_MS = 10_000;

const TEXT_FIELDS = ['homeTenantId', 'username', 'firstName', 'lastName', 'email', 'contactConsentDate'] as const;

function isUserRecord(value: unknown): value is UserRecord {
  if (typeof value !== 'object' || value === null) return false;
  const fields = value as Record<string, unknown>;
  return typeof fields['contactConsent'] === 'boolean' && TEXT_FIELDS.every((field) => typeof fields[field] === 'string');
}

/**
 * Talks to `/api/user`. The API takes every User record field from the access token and acts only
 * on the record of the User it names; the only thing this client sends is the Contact consent choice.
 */
export function createUserRecordClient(
  accessToken: () => Promise<string>,
  fetchFn: typeof fetch = (...args) => fetch(...args),
  timeoutMs = DEFAULT_TIMEOUT_MS,
): UserRecordClient {
  async function send(method: 'GET' | 'PUT' | 'DELETE', body?: string, path = '/api/user'): Promise<Response> {
    const headers = new Headers({ Authorization: `Bearer ${await accessToken()}` });
    if (body) headers.set('Content-Type', 'application/json');
    return fetchFn(path, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
  }

  const failed = (response: Response) => new Error(`The User record service answered HTTP ${response.status}.`);

  async function recordOf(response: Response): Promise<UserRecord> {
    if (!response.ok) throw failed(response);
    const json: unknown = await response.json();
    if (!isUserRecord(json)) throw new Error('The User record service sent an unexpected answer.');
    return json;
  }

  return {
    userRecord: async () => {
      const response = await send('GET');
      return response.status === 404 ? null : recordOf(response);
    },
    saveContactConsent: async (contactConsent) => recordOf(await send('PUT', JSON.stringify({ contactConsent }))),
    listUserRecords: async () => {
      const response = await send('GET', undefined, '/api/users');
      if (response.status === 403) return { status: 'not-allowed' };
      if (!response.ok) throw failed(response);
      const json: unknown = await response.json();
      const users = typeof json === 'object' && json !== null ? (json as Record<string, unknown>)['users'] : undefined;
      if (!Array.isArray(users) || !users.every(isUserRecord)) throw new Error('The User record service sent an unexpected answer.');
      return { status: 'allowed', users };
    },
    deleteUserRecord: async () => {
      const response = await send('DELETE');
      if (response.status !== 204) throw failed(response);
    },
  };
}
