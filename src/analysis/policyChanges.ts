// Changes to Intune settings catalog policies and their assignments, from the Intune audit log.
// Pure: no network, storage or React.
import type { PolicyChanges } from './auditPeriods';

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null;

const POLICY = 'DeviceManagementConfigurationPolicy';
const ASSIGNMENT = 'DeviceManagementConfigurationPolicyAssignment';

/** A missed change could make a rule look Ready, so an answer that cannot be read fails the Audit period. */
const unexpectedAuditLog = () => new Error('Intune sent an unexpected audit log.');

/** The policy a resource of an audit event belongs to; an assignment's ID starts with its policy's ID. */
function policyIdOf(resource: Json): string | null {
  const type = resource['auditResourceType'];
  if (type !== POLICY && type !== ASSIGNMENT) return null;
  const id = resource['resourceId'];
  if (typeof id !== 'string' || id === '') throw unexpectedAuditLog();
  return type === POLICY ? id : (id.split('_')[0] ?? id);
}

/**
 * From the items of GET /deviceManagement/auditEvents read from `since` on: every change to a
 * settings catalog policy or its assignments, by policy. Intune does not record which settings a
 * change touched, so every change counts.
 */
export function policyChangesFromAuditEvents(events: unknown[], since: string): PolicyChanges {
  const changes = events.flatMap((event) => {
    if (!isObject(event) || !Array.isArray(event['resources'])) throw unexpectedAuditLog();
    const policyIds = new Set(event['resources'].flatMap((resource) => (isObject(resource) ? (policyIdOf(resource) ?? []) : [])));
    if (policyIds.size === 0) return [];
    const at = event['activityDateTime'];
    if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) throw unexpectedAuditLog();
    return [...policyIds].map((policyId) => ({ policyId, at }));
  });
  return { since, changes };
}
