/** The answer to a request without a valid access token. */
export const unauthorized = {
  status: 401,
  jsonBody: { error: 'A valid access token is required.' },
  headers: { 'WWW-Authenticate': 'Bearer' },
} as const;

/** The token of an `Authorization: Bearer <token>` header, or null. */
export function bearerToken(authorization: string | null): string | null {
  const match = /^Bearer (\S+)$/.exec(authorization ?? '');
  return match?.[1] ?? null;
}
