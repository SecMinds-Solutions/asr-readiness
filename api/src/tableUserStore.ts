import { RestError, type TableClient } from '@azure/data-tables';
import type { UserStore } from './userHandler.js';

const isNotFound = (error: unknown) => error instanceof RestError && error.statusCode === 404;
import { fromEntity, rowKeyOf, toEntity, type UserEntity } from './userRecord.js';

/** The part of the Table Storage client the store uses. */
export type UserTable = Pick<TableClient, 'getEntity' | 'upsertEntity' | 'deleteEntity'>;

/** User records in one Table Storage table, partitioned by Home tenant. */
export function tableUserStore(table: UserTable): UserStore {
  return {
    async get(homeTenantId, username) {
      try {
        return fromEntity(await table.getEntity<UserEntity>(homeTenantId, rowKeyOf(username)));
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async save(record) {
      // Replace, not merge: a stored entity never keeps a property the record does not have.
      await table.upsertEntity(toEntity(record), 'Replace');
    },
    async delete(homeTenantId, username) {
      // Table Storage keeps no deleted entities: once this succeeds, the record is gone.
      try {
        await table.deleteEntity(homeTenantId, rowKeyOf(username));
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    },
  };
}
