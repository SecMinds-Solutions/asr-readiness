import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { handleUserRequest } from '../userHandler.js';
import { dependencies } from '../dependencies.js';

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
