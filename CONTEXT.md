# ASR Readiness

A free, open-source community tool that helps organisations move Microsoft Defender Attack Surface Reduction rules from audit mode to block mode safely, by judging each rule's readiness from its audit events.

## Language

### Rules and modes

**ASR rule**:
One of Microsoft Defender's Attack Surface Reduction rules, identified by its GUID.
_Avoid_: policy, setting

**Rule mode**:
How an ASR rule is configured in a tenant: Not configured, Disabled, Audit, Warn or Block.
_Avoid_: state, action

**Conflict**:
Intune policies that set different Rule modes for one ASR rule and share an assignment target: the same group, or All devices, All users or a target type the app does not recognise on either side. Such policies may reach the same devices, and on a device that gets both Intune applies neither until the policies agree. Exclusions and assignment filters are not taken into account.
_Avoid_: clash, overlap

**Differs by group**:
Intune policies that set different Rule modes for one ASR rule and are assigned to different groups, such as an audit group and a block group. Each device gets the Rule mode of its group. It is a Conflict only on a device that is in groups with different Rule modes, which the app cannot see without reading group members.
_Avoid_: split mode, mixed mode, partial conflict

**Audit event**:
A record that an ASR rule in Audit mode would have blocked something on a device.
_Avoid_: alert, detection, hit

**Exclusion**:
A file or folder path that an ASR rule ignores, either for all rules or for one rule.

### Analysis

**Analysis**:
One on-request evaluation of a Tenant's ASR rules and audit events. An Analysis happens in the User's browser, is never sent to SecMinds and is never stored.
_Avoid_: scan, assessment, report

**Verdict**:
The outcome of an Analysis for one ASR rule across a whole Tenant: Ready to block, Ready with exclusions, Not ready, or No evidence.
_Avoid_: score, status, rating

**Ready to block**:
The Verdict for a rule that has been in Audit mode for at least the Minimum audit period and has no audit events in the Observation window.

**Ready with exclusions**:
The Verdict for a rule whose audit events all come from a few paths, none in a User-writable location, which become its Suggested exclusions.

**Not ready**:
The Verdict for a rule whose audit events are too many, too spread out, or come from a User-writable location, so they cannot be excluded safely.
_Avoid_: too noisy, failed

**No evidence**:
The Verdict for a rule that is not in Audit mode, or not for the Minimum audit period, so its audit events say nothing yet.
_Avoid_: unknown, no data

**Already blocking**:
A rule already in Block mode. It is shown as its Rule mode, not given a Verdict.

**Observation window**:
The period of audit events an Analysis looks at: the last 30 days.

**Minimum audit period**:
How long a rule must have been in Audit mode before its absence of events means anything: 14 days.

**User-writable location**:
A path where ordinary users can create files, such as Downloads, the temp folder, AppData or removable drives. Never a Suggested exclusion.

**Suggested exclusion**:
An Exclusion the Analysis proposes for one rule so it can move to Block mode.

**Suggested policy**:
An Intune ASR policy the Analysis produces for the Tenant's admin to import, assign and deploy themselves. It sets Ready to block and Ready with exclusions rules to Block, with their Suggested exclusions, and leaves every other rule unchanged.
_Avoid_: generated policy, deployment

### People and tenants

**Tenant**:
A Microsoft Entra tenant whose ASR rules are analysed. For an MSP this is the customer's tenant, not their own.
_Avoid_: customer, organisation

**Home tenant**:
The Entra tenant a User's own account belongs to. It is the tenant stored with a User; Tenants they analysed are not stored.

**Coverage**:
The share of a Tenant's devices on which a rule is in Audit mode, shown with every Verdict because a Verdict only speaks for those devices.

**Supported tenant**:
A Tenant licensed for Microsoft Defender for Endpoint Plan 2, which provides the advanced hunting data an Analysis needs.

**User**:
A person who signs in with an Entra account. The only data kept about a User is their Home tenant, username, first name, last name, email address and Contact consent.
_Avoid_: customer, account, lead

**Contact consent**:
A User's opt-in, with its date, to hear from SecMinds about its other products. Without it, a User is only emailed about the tool itself.
