import { numberColumn } from '../analysis/huntingRows';
import { HUNTING_CHECK_QUERY } from '../analysis/queries';
import { errorMessage } from '../errorMessage';
import { GraphError, type GraphClient } from '../graph/client';
import { runHuntingQuery } from '../graph/hunting';

/**
 * Whether an Analysis can run for the signed-in User in this Tenant (ADR-0001).
 *
 * Microsoft Graph does not document a separate error for a Tenant without advanced hunting and
 * for a User without the Defender role: both are refused (403). A refused advanced hunting call is
 * therefore reported as access needed, which names both causes. Only advanced hunting without the
 * Defender for Endpoint tables is reported as not supported. Advanced hunting without onboarded
 * devices may still be a Supported tenant; it just has nothing to analyse yet.
 */
export type Readiness =
  | { status: 'ready'; devices: number }
  | { status: 'no-devices' }
  | { status: 'not-supported'; details: string }
  | { status: 'access-needed'; advancedHunting: Access; intune: Access; details: string[] }
  | { status: 'failed'; message: string };

export type Access = 'allowed' | 'refused';

/** One settings catalog policy ID; Intune configuration policies are only in Graph beta. */
const INTUNE_CHECK_PATH = '/deviceManagement/configurationPolicies?$top=1&$select=id';

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

const settle = <T>(promise: Promise<T>): Promise<Outcome<T>> =>
  promise.then(
    (value) => ({ ok: true, value }),
    (error: unknown) => ({ ok: false, error }),
  );

// 403 means the User lacks a role (or, for advanced hunting, the Tenant a licence); the Graph client
// also reports Intune's wrapped Forbidden as 403. A 401 is a token problem, not a missing role, so
// it is reported as failed.
const isRefused = (error: unknown) => error instanceof GraphError && error.status === 403;

/** The query runs only where Defender for Endpoint feeds advanced hunting; elsewhere its table is unknown. */
const isMissingDeviceTable = (error: unknown) =>
  error instanceof GraphError && error.status === 400 && error.message.includes('DeviceInfo');

/** The device count from the hunting result rows; no row means no devices. */
function deviceCount(rows: unknown[]): number {
  const row = rows[0];
  return row === undefined ? 0 : numberColumn(row, 'Devices');
}

/** Runs one small advanced hunting query and one light Intune read, in parallel. */
export async function checkReadiness(graph: GraphClient): Promise<Readiness> {
  const [hunting, intune] = await Promise.all([
    settle(runHuntingQuery(graph, HUNTING_CHECK_QUERY)),
    settle(graph.get<unknown>(INTUNE_CHECK_PATH, { version: 'beta' })),
  ]);

  let devices = 0;
  if (hunting.ok) {
    try {
      devices = deviceCount(hunting.value);
    } catch (error) {
      return { status: 'failed', message: `Advanced hunting: ${errorMessage(error)}` };
    }
  } else if (isMissingDeviceTable(hunting.error)) {
    return { status: 'not-supported', details: errorMessage(hunting.error) };
  } else if (!isRefused(hunting.error)) {
    return { status: 'failed', message: `Advanced hunting: ${errorMessage(hunting.error)}` };
  }
  if (!intune.ok && !isRefused(intune.error)) {
    return { status: 'failed', message: `Intune: ${errorMessage(intune.error)}` };
  }

  // Without onboarded devices, roles do not matter yet: there is nothing to analyse.
  if (hunting.ok && devices === 0) return { status: 'no-devices' };
  if (hunting.ok && intune.ok) return { status: 'ready', devices };

  const details: string[] = [];
  if (!hunting.ok) details.push(`Advanced hunting: ${errorMessage(hunting.error)}`);
  if (!intune.ok) details.push(`Intune: ${errorMessage(intune.error)}`);
  return {
    status: 'access-needed',
    advancedHunting: hunting.ok ? 'allowed' : 'refused',
    intune: intune.ok ? 'allowed' : 'refused',
    details,
  };
}

/**
 * The onboarding check as the UI runs it. A check the User asks for again (after an admin assigned
 * a role) first gets a new Graph token: the cached one carries the Microsoft Entra roles from before.
 * Intune and Defender roles are evaluated by those services and do not depend on the token.
 */
export type ReadinessCheck = (options: { freshToken: boolean }) => Promise<Readiness>;

export function createReadinessCheck(graph: GraphClient, refreshGraphToken: () => Promise<void>): ReadinessCheck {
  return async ({ freshToken }) => {
    if (freshToken) await refreshGraphToken();
    return checkReadiness(graph);
  };
}
