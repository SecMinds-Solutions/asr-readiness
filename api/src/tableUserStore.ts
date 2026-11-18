import { RestError, type TableClient } from '@azure/data-tables';
import type { UserStore } from './userHandler.js';

const isNotFound = (error: unknown) => error instanceof RestError && error.statusCode === 404;
import { fromEntity, rowKeyOf, toEntity, type UserEntity, type UserRecord } from './userRecord.js';

/** The part of the Table Storage client the store uses. */
export type UserTable = Pick<TableClient, 'getEntity' | 'upsertEntity' | 'deleteEntity' | 'listEntities'>;

/** User records in one Table Storage table, partitioned by Home tenant. */
export function tableUserStore(table: UserTable): UserStore & { list(): Promise<UserRecord[]> } {
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
    /** Every record; the SDK's iterator follows continuation tokens, so this reads every page. */
    async list() {
      const records: UserRecord[] = [];
      for await (const entity of table.listEntities<UserEntity>()) records.push(fromEntity(entity));
      return records;
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
