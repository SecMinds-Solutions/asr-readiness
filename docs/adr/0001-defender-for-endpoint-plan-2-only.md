# Only tenants with Defender for Endpoint Plan 2 are supported

An Analysis needs ASR audit events from advanced hunting, and Microsoft includes advanced hunting in Defender for Endpoint Plan 2 (also in Microsoft 365 E5 and the Defender Suite add-on for Business Premium) but not in Defender for Business. We therefore support only Plan 2 tenants. A tenant without it is detected at onboarding and shown why it is not supported, instead of getting an Analysis built on partial data.

## Considered Options

- Supporting Defender for Business through another data source, such as the ASR report in the Defender portal or Intune device reports: no app-level Graph source for those events was found. Worth revisiting if Microsoft adds one, because Business Premium tenants are a large share of the MSP audience.
- A reduced Analysis from the Intune policy alone, without events: rejected, because a Verdict without audit events cannot say whether blocking is safe.
