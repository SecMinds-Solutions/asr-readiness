# Only tenants with Defender for Endpoint Plan 2 are supported

An Analysis needs ASR audit events from advanced hunting, and Microsoft includes advanced hunting in Defender for Endpoint Plan 2 (also in Microsoft 365 E5 and the Defender Suite add-on for Business Premium) but not in Defender for Business. We therefore support only Plan 2 tenants. A tenant without it is detected at onboarding and shown why it is not supported, instead of getting an Analysis built on partial data.

## Detecting it at onboarding

The app may not read licences: that needs a directory permission beyond the delegated scopes of ADR-0002. Onboarding therefore runs one small advanced hunting query (the number of devices onboarded to Defender for Endpoint) and reads one Intune policy:

- Onboarded devices found and the Intune read allowed: the User may run an Analysis.
- Advanced hunting has no Defender for Endpoint device table: the Tenant is not supported.
- Advanced hunting works but shows no onboarded devices: the Tenant may be supported, but there is nothing to analyse yet (or the User cannot see the device groups).
- Advanced hunting or the Intune read refused: the User is told which role is missing and where to assign it. Microsoft Graph refuses advanced hunting the same way for a User without the role and for a Tenant without the licence, so that message names both.
- Any other error, including an expired token, is shown as a failed check with a retry, never as a verdict on the Tenant.

## Considered Options

- Supporting Defender for Business through another data source, such as the ASR report in the Defender portal or Intune device reports: no app-level Graph source for those events was found. Worth revisiting if Microsoft adds one, because Business Premium tenants are a large share of the MSP audience.
- A reduced Analysis from the Intune policy alone, without events: rejected, because a Verdict without audit events cannot say whether blocking is safe.
