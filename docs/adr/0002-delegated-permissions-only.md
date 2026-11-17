# Graph access uses delegated permissions only

Every Graph call (advanced hunting and Intune policy reads) runs on behalf of the signed-in User, with their own Defender and Intune roles. The app registration has no application permissions and SecMinds holds no secret or certificate that can read a Tenant's security data without a User present. This matches the on-request, read-only nature of an Analysis and keeps the trust story simple: the tool can see only what the signed-in User can see, and only while they use it.

The app requests exactly these delegated permissions: `openid`, `profile`, `email`, `User.Read`, `ThreatHunting.Read.All` and `DeviceManagementConfiguration.Read.All`. MSAL.js also asks for `offline_access` at sign-in, as it always does. That scope gives the browser a refresh token so the app can renew its access tokens without sending the User back to the sign-in page every hour. The refresh token is kept with the other tokens in the browser tab's session storage, is gone when the tab closes, and grants nothing beyond the delegated permissions above.

The app registration also exposes one delegated scope of its own, `UserRecord.ReadWrite`, and requests it. The browser uses it only to call the app's own API, which stores the User record (ADR-0005). It gives no access to Microsoft Graph or to any data in the Tenant, and the same admin consent covers it.

## Consequences

- MSPs analyse customer Tenants through GDAP (or a guest account); each customer Tenant gives admin consent once.
- Nothing can run in the background or on a schedule. Adding application permissions later means every Tenant re-consents.
