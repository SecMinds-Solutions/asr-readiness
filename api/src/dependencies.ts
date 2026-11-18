import { TableClient } from '@azure/data-tables';
import { ManagedIdentityCredential } from '@azure/identity';
import { readSettings, type Settings } from './settings.js';
import { tableUserStore } from './tableUserStore.js';
import { ENTRA_SIGNING_KEYS, verifyAccessToken } from './token.js';

export interface Dependencies {
  settings: Settings;
  store: ReturnType<typeof tableUserStore>;
  now(): Date;
  verify(token: string): Promise<Record<string, unknown>>;
}

let deps: Dependencies | undefined;

/** Built on first use, so a missing app setting fails the request with a clear log line. */
export function dependencies(): Dependencies {
  if (deps) return deps;
  const settings = readSettings(process.env);
  // The Function App's system-assigned identity; it has a data role on the users table only.
  const table = new TableClient(settings.tableEndpoint, settings.tableName, new ManagedIdentityCredential());
  deps = {
    settings,
    store: tableUserStore(table),
    now: () => new Date(),
    verify: (token) => verifyAccessToken(token, { clientId: settings.clientId, keys: ENTRA_SIGNING_KEYS }),
  };
  return deps;
}
