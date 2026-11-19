import { SecMinds } from '../design-system';
import type { Access } from '../onboarding/readiness';

const { Alert, Button, Card, Spinner } = SecMinds;

export function CheckingTenant() {
  return (
    <div className="app-row">
      <Spinner label="Checking your Tenant" />
      <p className="body app-text">Checking your Tenant…</p>
    </div>
  );
}

export function ReadyCard({ devices }: { devices: number }) {
  return (
    <Card title="Ready for an Analysis">
      <p className="app-text">
        Advanced hunting and the Intune policies can be read with your roles, and advanced hunting shows {devices}{' '}
        {devices === 1 ? 'device' : 'devices'} onboarded to Defender for Endpoint that you can see.
      </p>
    </Card>
  );
}

export function NoDevicesCard({ onCheckAgain }: { onCheckAgain: () => void }) {
  return (
    <Card
      title="No devices to analyse yet"
      footer={
        <Button variant="secondary" onClick={onCheckAgain}>
          Check again
        </Button>
      }
    >
      <p className="app-text">
        Advanced hunting works, but it shows no devices onboarded to Defender for Endpoint that you can see, so there
        are no ASR audit events to analyse. Onboard devices, or ask an admin to give you access to their device groups.
      </p>
    </Card>
  );
}

export function NotSupportedCard({ details }: { details: string }) {
  return (
    <Card title="Your Tenant is not supported">
      <p className="app-text">Advanced hunting has no Defender for Endpoint data in this Tenant.</p>
      <p className="app-text">
        ASR Compass needs Microsoft Defender for Endpoint Plan 2, also included in Microsoft 365 E5 and the Defender
        Suite add-on for Business Premium. An Analysis reads ASR audit events from advanced hunting, which Plan 2 provides.
        Defender for Business is not supported: it has no advanced hunting, and without audit events a Verdict cannot
        say whether blocking a rule is safe.
      </p>
      <p className="app-text code app-break">{details}</p>
    </Card>
  );
}

export function AccessNeededAlert({
  advancedHunting,
  intune,
  details,
  onCheckAgain,
}: {
  advancedHunting: Access;
  intune: Access;
  details: string[];
  onCheckAgain: () => void;
}) {
  return (
    <Alert tone="warning" title="Access needed">
      <p className="app-text">Your roles do not allow everything an Analysis needs. Ask an admin to assign:</p>
      <ul className="app-list">
        {advancedHunting === 'refused' && (
          <li>
            <strong>Advanced hunting:</strong> a Microsoft Defender XDR role with Security operations › Security data ›
            Security data basics (read), in the Microsoft Defender portal under Permissions and roles, or the Microsoft
            Entra role Security Reader. Where unified RBAC is not turned on for Defender for Endpoint, a Defender for
            Endpoint role with View data also works. Microsoft gives the same answer when the Tenant has no Defender for Endpoint Plan
            2, so check that licence too: without it the Tenant is not supported.
          </li>
        )}
        {intune === 'refused' && (
          <li>
            <strong>Intune:</strong> an Intune role with Device configurations › Read, such as Read Only Operator, in the
            Microsoft Intune admin center under Tenant administration › Roles.
          </li>
        )}
      </ul>
      {details.map((detail) => (
        <p key={detail} className="app-text code app-break">
          {detail}
        </p>
      ))}
      <Button variant="secondary" size="sm" onClick={onCheckAgain}>
        Check again
      </Button>
    </Alert>
  );
}

export function CheckFailedAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="danger" title="Your Tenant could not be checked">
      <p className="app-text">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  );
}
