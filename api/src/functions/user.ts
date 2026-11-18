import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { TableClient } from '@azure/data-tables';
import { ManagedIdentityCredential } from '@azure/identity';
import { readSettings } from '../settings.js';
import { tableUserStore } from '../tableUserStore.js';
import { ENTRA_SIGNING_KEYS, verifyAccessToken } from '../token.js';
import { handleUserRequest, type UserHandlerDeps } from '../userHandler.js';

let deps: UserHandlerDeps | undefined;

/** Built on first use, so a missing app setting fails the request with a clear log line. */
function dependencies(): UserHandlerDeps {
  if (deps) return deps;
  const settings = readSettings(process.env);
  // The Function App's system-assigned identity; it has a data role on the users table only.
  const table = new TableClient(settings.tableEndpoint, settings.tableName, new ManagedIdentityCredential());
  deps = {
    store: tableUserStore(table),
    now: () => new Date(),
    verify: (token) => verifyAccessToken(token, { clientId: settings.clientId, keys: ENTRA_SIGNING_KEYS }),
  };
  return deps;
}

async function user(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    return await handleUserRequest(
      { method: request.method, authorization: request.headers.get('authorization'), json: () => request.json() },
      dependencies(),
    );
  } catch (error) {
    // The error comes from configuration or Table Storage, never from the User's data.
    context.error('User record request failed:', error instanceof Error ? error.message : error);
    return { status: 500, jsonBody: { error: 'The User record could not be read, stored or deleted.' } };
  }
}

app.http('user', { route: 'user', methods: ['GET', 'PUT', 'DELETE'], authLevel: 'anonymous', handler: user });
