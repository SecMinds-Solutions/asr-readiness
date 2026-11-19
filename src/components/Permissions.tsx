import { SecMinds } from '../design-system';
import { SIGN_IN_SCOPES } from '../auth/msalAuthClient';

const { Table } = SecMinds;

/** What the app does with each permission it requests, in words for the User (see ADR-0002). */
export const PERMISSION_PURPOSES: Record<string, { purpose: string; access: string }> = {
  openid: { purpose: 'Signs you in with your Microsoft account.', access: 'Delegated, sign-in only' },
  profile: { purpose: 'Reads your name, to show it and store it in your User record.', access: 'Delegated, read-only' },
  email: { purpose: 'Reads your email address, to store it in your User record.', access: 'Delegated, read-only' },
  'User.Read': { purpose: 'Reads your own basic profile in Microsoft Graph, to sign you in.', access: 'Delegated, read-only' },
  offline_access: {
    purpose: "Keeps you signed in while this browser tab is open. Microsoft's sign-in library adds it.",
    access: 'Delegated, sign-in only',
  },
  'ThreatHunting.Read.All': {
    purpose: 'Runs advanced hunting queries that count Audit events and the Rule modes devices report.',
    access: 'Delegated, read-only',
  },
  'DeviceManagementConfiguration.Read.All': {
    purpose: 'Reads your Intune ASR policies and their assignments.',
    access: 'Delegated, read-only',
  },
  'UserRecord.ReadWrite': {
    purpose: "Reads, changes and deletes your own User record through ASR Compass's own API. It gives no access to Microsoft Graph.",
    access: 'Delegated, your own User record only',
  },
};

/** Every permission the app requests: the sign-in scopes, the one MSAL adds, and the app's own API scope. */
export const REQUESTED_PERMISSIONS: readonly string[] = [...SIGN_IN_SCOPES, 'offline_access', 'UserRecord.ReadWrite'];

/** The permissions ASR Compass requests, what it does with each, and how to withdraw them. */
export function PermissionsList() {
  return (
    <>
      <div className="app-table-scroll">
        <Table
          caption="Permissions ASR Compass requests"
          columns={[
            { key: 'scope', label: 'Permission', render: (scope: string) => <span className="code app-break">{scope}</span> },
            { key: 'purpose', label: 'What ASR Compass does with it', render: (scope: string) => PERMISSION_PURPOSES[scope]?.purpose },
            { key: 'access', label: 'Access', render: (scope: string) => PERMISSION_PURPOSES[scope]?.access },
          ]}
          rows={[...REQUESTED_PERMISSIONS]}
        />
      </div>
      <p className="app-text app-hint">
        ASR Compass acts only as you, with your own roles, while you use it; it has no permissions of its own. An admin of
        your tenant gave consent for these permissions once, for everyone in the tenant. An admin withdraws that consent by
        removing ASR Compass under Enterprise applications in the Microsoft Entra admin center.
      </p>
    </>
  );
}
