import { SecMinds } from '../design-system';
import { OBSERVATION_WINDOW_DAYS } from '../analysis/thresholds';

const { Button } = SecMinds;

const DAY_MS = 24 * 60 * 60 * 1000;

const dateText = (date: Date) => date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const timeText = (date: Date) =>
  date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * The context of every page of the Analysis: which Tenant, how many devices, the Observation window,
 * when the Analysis was read, and Read again. The Tenant is shown by its ID: the app does not read
 * the Tenant's name.
 */
export function TenantStatus({
  tenantId,
  devices,
  readAt,
  reading,
  onReadAgain,
}: {
  tenantId: string;
  devices: number;
  /** When the Analysis was read; null while it is being read or a part failed. */
  readAt: Date | null;
  /** Whether a part of the Analysis is still being read. */
  reading: boolean;
  onReadAgain: () => void;
}) {
  return (
    <section className="app-status" aria-label="Tenant">
      <dl className="app-status-list">
        <div>
          <dt>Tenant</dt>
          <dd className="code app-break">{tenantId}</dd>
        </div>
        <div>
          <dt>Devices</dt>
          <dd>{devices}</dd>
        </div>
        <div>
          <dt>Observation window</dt>
          <dd>
            {readAt
              ? `${dateText(new Date(readAt.getTime() - OBSERVATION_WINDOW_DAYS * DAY_MS))} – ${dateText(readAt)}`
              : `The last ${OBSERVATION_WINDOW_DAYS} days`}
          </dd>
        </div>
        <div>
          <dt>Read at</dt>
          <dd>{reading ? 'Reading…' : readAt ? timeText(readAt) : 'Not every part could be read'}</dd>
        </div>
      </dl>
      <Button variant="secondary" size="sm" icon="refresh-cw" onClick={onReadAgain} loading={reading} disabled={reading}>
        Read again
      </Button>
    </section>
  );
}
