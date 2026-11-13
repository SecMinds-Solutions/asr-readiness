# Graph access uses delegated permissions only

Every Graph call (advanced hunting and Intune policy reads) runs on behalf of the signed-in User, with their own Defender and Intune roles. The app registration has no application permissions and SecMinds holds no secret or certificate that can read a Tenant's security data without a User present. This matches the on-request, read-only nature of an Analysis and keeps the trust story simple: the tool can see only what the signed-in User can see, and only while they use it.

## Consequences

- MSPs analyse customer Tenants through GDAP (or a guest account); each customer Tenant gives admin consent once.
- Nothing can run in the background or on a schedule. Adding application permissions later means every Tenant re-consents.
