import { GUID } from './guid.js';

/** The Function's configuration, from its app settings. */
export interface Settings {
  /** Client ID of the Entra app registration: the audience of the access tokens. */
  clientId: string;
  tableEndpoint: string;
  tableName: string;
}


function setting(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`App setting ${name} is not set.`);
  return value;
}

export function readSettings(env: Record<string, string | undefined>): Settings {
  const clientId = setting(env, 'ENTRA_CLIENT_ID');
  if (!GUID.test(clientId)) throw new Error('App setting ENTRA_CLIENT_ID is not a GUID.');
  const tableEndpoint = setting(env, 'USER_TABLE_ENDPOINT');
  if (!tableEndpoint.startsWith('https://')) throw new Error('App setting USER_TABLE_ENDPOINT must be an https URL.');
  return { clientId, tableEndpoint, tableName: setting(env, 'USER_TABLE_NAME') };
}
