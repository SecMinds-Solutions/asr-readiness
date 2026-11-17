/** The signed-in User's Contact consent choice and when they made it, as the API returns it. */
export interface ContactConsent {
  contactConsent: boolean;
  contactConsentDate: string;
}

/** Reads and stores the signed-in User's record through the app's own API. */
export interface UserRecordClient {
  /** The stored Contact consent, or null when the User has no record yet. */
  contactConsent(): Promise<ContactConsent | null>;
  saveContactConsent(contactConsent: boolean): Promise<ContactConsent>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function isContactConsent(value: unknown): value is ContactConsent {
  if (typeof value !== 'object' || value === null) return false;
  const { contactConsent, contactConsentDate } = value as Record<string, unknown>;
  return typeof contactConsent === 'boolean' && typeof contactConsentDate === 'string';
}

/**
 * Talks to `/api/user`. The API takes every User record field from the access token; the only
 * thing this client sends is the Contact consent choice.
 */
export function createUserRecordClient(
  accessToken: () => Promise<string>,
  fetchFn: typeof fetch = (...args) => fetch(...args),
  timeoutMs = DEFAULT_TIMEOUT_MS,
): UserRecordClient {
  async function requestUserRecord(method: 'GET' | 'PUT', body?: string): Promise<ContactConsent | null> {
    const headers = new Headers({ Authorization: `Bearer ${await accessToken()}` });
    if (body) headers.set('Content-Type', 'application/json');
    const response = await fetchFn('/api/user', { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
    if (method === 'GET' && response.status === 404) return null;
    if (!response.ok) throw new Error(`The User record service answered HTTP ${response.status}.`);
    const json: unknown = await response.json();
    if (!isContactConsent(json)) throw new Error('The User record service sent an unexpected answer.');
    return json;
  }

  return {
    contactConsent: () => requestUserRecord('GET'),
    saveContactConsent: async (contactConsent) => {
      const saved = await requestUserRecord('PUT', JSON.stringify({ contactConsent }));
      if (!saved) throw new Error('The User record service sent no Contact consent.');
      return saved;
    },
  };
}
