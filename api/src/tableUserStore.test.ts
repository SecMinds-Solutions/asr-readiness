import { RestError } from '@azure/data-tables';
import { tableUserStore, type UserTable } from './tableUserStore.js';
import type { UserRecord } from './userRecord.js';

const ada: UserRecord = {
  homeTenantId: '11111111-1111-1111-1111-111111111111',
  username: 'ada@contoso.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@contoso.com',
  contactConsent: true,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
};

function fakeTable(overrides: Partial<UserTable> = {}): UserTable {
  return { getEntity: vi.fn(), upsertEntity: vi.fn(async () => ({})), deleteEntity: vi.fn(async () => ({})), ...overrides } as UserTable;
}

describe('tableUserStore', () => {
  it('replaces the whole entity with exactly the six fields', async () => {
    const table = fakeTable();
    await tableUserStore(table).save(ada);
    expect(table.upsertEntity).toHaveBeenCalledWith(
      {
        partitionKey: ada.homeTenantId,
        rowKey: 'ada%40contoso.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@contoso.com',
        contactConsent: true,
        contactConsentDate: '2026-11-17T10:00:00.000Z',
      },
      'Replace',
    );
  });

  it('reads a stored record by Home tenant and username, without Table Storage metadata', async () => {
    const getEntity = vi.fn(async () => ({
      partitionKey: ada.homeTenantId,
      rowKey: 'ada%40contoso.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@contoso.com',
      contactConsent: true,
      contactConsentDate: '2026-11-17T10:00:00.000Z',
      etag: 'W/"1"',
      timestamp: '2026-11-17T10:00:01Z',
    }));
    const record = await tableUserStore(fakeTable({ getEntity } as Partial<UserTable>)).get(ada.homeTenantId, ada.username);
    expect(getEntity).toHaveBeenCalledWith(ada.homeTenantId, 'ada%40contoso.com');
    expect(record).toEqual(ada);
  });

  it('returns null for a User without a record', async () => {
    const getEntity = vi.fn(async () => Promise.reject(new RestError('not found', { statusCode: 404 })));
    await expect(tableUserStore(fakeTable({ getEntity } as Partial<UserTable>)).get(ada.homeTenantId, ada.username)).resolves.toBeNull();
  });

  it('deletes the entity of a Home tenant and username', async () => {
    const table = fakeTable();
    await tableUserStore(table).delete(ada.homeTenantId, ada.username);
    expect(table.deleteEntity).toHaveBeenCalledWith(ada.homeTenantId, 'ada%40contoso.com');
  });

  it('treats deleting a record that does not exist as done', async () => {
    const deleteEntity = vi.fn(async () => Promise.reject(new RestError('not found', { statusCode: 404 })));
    await expect(tableUserStore(fakeTable({ deleteEntity } as Partial<UserTable>)).delete(ada.homeTenantId, ada.username)).resolves.toBeUndefined();
  });

  it('passes on other errors when deleting', async () => {
    const deleteEntity = vi.fn(async () => Promise.reject(new RestError('forbidden', { statusCode: 403 })));
    await expect(tableUserStore(fakeTable({ deleteEntity } as Partial<UserTable>)).delete(ada.homeTenantId, ada.username)).rejects.toThrow('forbidden');
  });

  it('passes on other storage errors', async () => {
    const getEntity = vi.fn(async () => Promise.reject(new RestError('forbidden', { statusCode: 403 })));
    await expect(tableUserStore(fakeTable({ getEntity } as Partial<UserTable>)).get(ada.homeTenantId, ada.username)).rejects.toThrow('forbidden');
  });
});
