import { RestError, type TableClient } from '@azure/data-tables';
import type { UserStore } from './userHandler.js';
import { fromEntity, rowKeyOf, toEntity, type UserEntity } from './userRecord.js';

/** The part of the Table Storage client the store uses. */
export type UserTable = Pick<TableClient, 'getEntity' | 'upsertEntity'>;

/** User records in one Table Storage table, partitioned by Home tenant. */
export function tableUserStore(table: UserTable): UserStore {
  return {
    async get(homeTenantId, username) {
      try {
        return fromEntity(await table.getEntity<UserEntity>(homeTenantId, rowKeyOf(username)));
      } catch (error) {
        if (error instanceof RestError && error.statusCode === 404) return null;
        throw error;
      }
    },
    async save(record) {
      // Replace, not merge: a stored entity never keeps a property the record does not have.
      await table.upsertEntity(toEntity(record), 'Replace');
    },
  };
}
