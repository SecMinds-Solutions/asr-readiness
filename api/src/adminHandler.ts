import { bearerToken, unauthorized } from './bearer.js';
import type { UserRecord } from './userRecord.js';

/** The app role, on the app registration, that makes a User a SecMinds admin. */
export const ADMIN_ROLE = 'Admin';

export interface AdminRequest {
  method: string;
  authorization: string | null;
}

export interface AdminResponse {
  status: number;
  jsonBody?: { users: UserRecord[] } | { error: string };
  headers?: Record<string, string>;
}

export interface AdminHandlerDeps {
  /** The tenant whose Admin role assignments count; null means nobody is an admin. */
  adminTenantId: string | null;
  store: { list(): Promise<UserRecord[]> };
  /** Verifies the access token and returns its claims; throws when it is not valid. */
  verify(token: string): Promise<Record<string, unknown>>;
}

/**
 * Whether validated claims belong to a SecMinds admin: the Admin app role, assigned in the admin
 * tenant. The app is multi-tenant, so an email address or username proves nothing, and a role a
 * User has in another tenant does not count.
 */
export function isAdmin(claims: Record<string, unknown>, adminTenantId: string | null): boolean {
  if (!adminTenantId || claims['tid'] !== adminTenantId) return false;
  const roles = claims['roles'];
  return Array.isArray(roles) && roles.includes(ADMIN_ROLE);
}

/** GET returns every User record to a SecMinds admin; it never changes or deletes one. */
export async function handleAdminUsersRequest(request: AdminRequest, { adminTenantId, store, verify }: AdminHandlerDeps): Promise<AdminResponse> {
  if (request.method !== 'GET') return { status: 405, headers: { Allow: 'GET' } };

  const token = bearerToken(request.authorization);
  if (!token) return { ...unauthorized };
  let claims: Record<string, unknown>;
  try {
    claims = await verify(token);
  } catch {
    return { ...unauthorized };
  }

  if (!isAdmin(claims, adminTenantId)) return { status: 403, jsonBody: { error: 'Only SecMinds admins can list User records.' } };
  return { status: 200, jsonBody: { users: await store.list() } };
}
