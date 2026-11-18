# ASR Readiness

A free, open-source community tool that helps organisations move Microsoft Defender Attack Surface Reduction rules from audit mode to block mode safely, by judging each rule's readiness from its audit events.

## Language

### Rules and modes

**ASR rule**:
One of Microsoft Defender's Attack Surface Reduction rules, identified by its GUID.
_Avoid_: policy, setting

**Rule mode**:
How an ASR rule is configured in a tenant, or runs on a device: Not configured, Disabled, Audit, Warn or Block.
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
The Verdict for a rule that Intune sets to Audit mode (on all groups, or on some when Rule modes differ by group), whose Audit period reaches the Minimum audit period, and that has no audit events in the Observation window.

**Ready with exclusions**:
The Verdict for a rule whose audit events all come from at most 5 paths, none in a User-writable location and none triggered by an application in one or in an unknown folder, which become its Suggested exclusions. The path is the file the rule blocks: for most rules the file it acts on, for the LSASS credential theft rule the process that accesses LSASS.

**Not ready**:
The Verdict for a rule whose audit events are too many, too spread out, or come from a User-writable location or from an application that runs from one, so they cannot be excluded safely.
_Avoid_: too noisy, failed

**No evidence**:
The Verdict for a rule that is not in Audit mode, or not for the Minimum audit period, so its audit events say nothing yet. This includes a Conflict, a rule no device reports in Audit mode, and a rule whose audit events advanced hunting does not record.
_Avoid_: unknown, no data

**Already blocking**:
A rule the Tenant's Intune policies already set to Block mode. It is shown as such, not given a Verdict.

**Observation window**:
The period of audit events an Analysis looks at: the last 30 days.

**Minimum audit period**:
How long a rule's Audit period must be before its absence of events means anything: 14 days.

**Audit period**:
How long a rule has been in Audit mode, measured on the devices that now report it in Audit mode: since when each has reported Audit every day without a break, where a day that is not Audit or more than 3 days without a report is a break, and the period ends at the device's last report. A device that switched to Audit mode during its latest day counts with 0 days. The shortest period across those devices is the rule's Audit period; when it covers fewer devices than Coverage, there is no Audit period. It cannot be longer than the 30 days advanced hunting keeps.
_Avoid_: audit duration, audit age

**User-writable location**:
A path where ordinary users can create files, such as Downloads, the temp folder, AppData or removable drives. Never a Suggested exclusion. To err on the safe side, every path counts as User-writable unless it is in Program Files or in Windows outside its known user-writable folders. A folder under Program Files whose permissions an installer loosened cannot be detected.

**Suggested exclusion**:
An Exclusion the Analysis proposes for one rule so it can move to Block mode.

**Suggested policy**:
An Intune ASR policy the Analysis produces for the Tenant's admin to import, assign and deploy themselves. It sets Ready to block and Ready with exclusions rules to Block, with their Suggested exclusions as per-rule exclusions, and leaves every other rule out, so the Tenant's own policies keep setting it. A device that gets it and a policy that sets one of its rules to Audit mode has a Conflict.
_Avoid_: generated policy, deployment

### People and tenants

**Tenant**:
A Microsoft Entra tenant whose ASR rules are analysed. For an MSP this is the customer's tenant, not their own.
_Avoid_: customer, organisation

**Home tenant**:
The Entra tenant a User's own account belongs to. It is the tenant stored with a User; Tenants they analysed are not stored.

**Coverage**:
The share of a Tenant's devices on which a rule is in Audit mode, shown with every Verdict because a Verdict only speaks for those devices. Counted over the devices that report their Rule modes to Defender for Endpoint, whatever configured them.

**Supported tenant**:
A Tenant licensed for Microsoft Defender for Endpoint Plan 2, which provides the advanced hunting data an Analysis needs.

**User**:
A person who signs in with an Entra account. The only data kept about a User is their Home tenant, username, first name, last name, email address and Contact consent, in their User record. A signed-in User can see their User record and delete it; once deleted, nothing about them remains.
_Avoid_: customer, account, lead

**Contact consent**:
A User's opt-in, with its date, to hear from SecMinds about its other products. Without it, a User is only emailed about the tool itself. A User can withdraw it, or give it later; each choice is stored with its date.
