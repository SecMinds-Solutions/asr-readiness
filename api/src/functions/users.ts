import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { handleAdminUsersRequest } from '../adminHandler.js';
import { dependencies } from '../dependencies.js';

/** Every User record, for SecMinds admins only (see adminHandler.ts). Read-only. */
async function users(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { settings, store, verify } = dependencies();
    return await handleAdminUsersRequest(
      { method: request.method, authorization: request.headers.get('authorization') },
      { adminTenantId: settings.adminTenantId, store, verify },
    );
  } catch (error) {
    // The error comes from configuration or Table Storage, never from a User's data.
    context.error('User list request failed:', error instanceof Error ? error.message : error);
    return { status: 500, jsonBody: { error: 'The User records could not be read.' } };
  }
}

// Not under /api/admin: Azure Functions reserves routes that start with "admin".
app.http('users', { route: 'users', methods: ['GET'], authLevel: 'anonymous', handler: users });
