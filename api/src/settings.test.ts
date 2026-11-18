import { readSettings } from './settings.js';

const valid = {
  ENTRA_CLIENT_ID: '0b5c3a1e-7d2f-4c8a-9e6b-1f2a3b4c5d6e',
  USER_TABLE_ENDPOINT: 'https://stusers.table.core.windows.net',
  USER_TABLE_NAME: 'users',
};

describe('readSettings', () => {
  it('reads the client ID, table endpoint and table name', () => {
    expect(readSettings(valid)).toEqual({
      clientId: valid.ENTRA_CLIENT_ID,
      tableEndpoint: valid.USER_TABLE_ENDPOINT,
      tableName: 'users',
      adminTenantId: null,
    });
  });

  it('reads the admin tenant when it is set', () => {
    const adminTenantId = '33333333-3333-3333-3333-333333333333';
    expect(readSettings({ ...valid, ADMIN_TENANT_ID: ` ${adminTenantId} ` }).adminTenantId).toBe(adminTenantId);
  });

  it('has no admin tenant when ADMIN_TENANT_ID is empty, so nobody is an admin', () => {
    expect(readSettings({ ...valid, ADMIN_TENANT_ID: ' ' }).adminTenantId).toBeNull();
  });

  it('refuses an admin tenant that is not a GUID', () => {
    expect(() => readSettings({ ...valid, ADMIN_TENANT_ID: 'secminds.nl' })).toThrow('ADMIN_TENANT_ID');
  });

  it.each(['ENTRA_CLIENT_ID', 'USER_TABLE_ENDPOINT', 'USER_TABLE_NAME'])('fails clearly when %s is missing', (name) => {
    expect(() => readSettings({ ...valid, [name]: '' })).toThrow(name);
  });

  it('refuses a client ID that is not a GUID, so no token can match an empty audience', () => {
    expect(() => readSettings({ ...valid, ENTRA_CLIENT_ID: 'not-set' })).toThrow('ENTRA_CLIENT_ID');
  });

  it('refuses a table endpoint that is not https', () => {
    expect(() => readSettings({ ...valid, USER_TABLE_ENDPOINT: 'http://stusers.table.core.windows.net' })).toThrow('USER_TABLE_ENDPOINT');
  });
});
