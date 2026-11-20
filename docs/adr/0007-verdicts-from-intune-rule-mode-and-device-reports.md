# Verdicts use Intune's Rule mode, and an Audit period from Intune's changes

A Verdict needs to know whether a rule is in Audit mode, and for how long. The app takes both from Intune: the Rule mode from the Tenant's policies, and the Audit period from when those policies or their assignments last changed.

- **Rule mode:** Intune's Rule mode decides whether a rule gets a Verdict. Block is shown as Already blocking. Audit is judged on its audit events. Not configured, Disabled, Warn and a Conflict give No evidence. When Rule modes differ by group and some groups are in Audit mode, the rule is judged, and the reason says which groups. Every Verdict is shown with its Coverage, the devices that report the rule in Audit mode, because a Verdict speaks only for those devices. A rule must have Coverage; otherwise the Verdict is No evidence.
- **Audit period:** the time since Intune last changed a policy that sets the rule, in any Rule mode and whether it is assigned or not, or that policy's assignments. A policy's own changes come from its creation and last change dates. Assignment changes come from the Intune audit log of the Observation window: the policy's last change date does not move when only an assignment changes, so the audit log is the only place they show. The audit log says that a policy changed, not which setting, so every change counts. When the audit log of the Observation window holds no change, the Audit period is at least 30 days. A policy without dates, or an audit log that cannot be read in full, gives No evidence. The Audit period must reach the Minimum audit period of 14 days.

## Considered Options

- **The Rule modes devices report to advanced hunting** (`DeviceTvmInfoGathering`): the app first measured, per device, since when it had reported Audit every day. On a real Tenant every device had exactly one record in 30 days: the table keeps only each device's latest record, which is enough for Coverage (ADR-0006) but holds no history. Every Audit period came out as 0 days. Dropped.
- **The change date of the Intune policy alone:** it does not move when an assignment changes, which can put a rule in Audit mode for new devices or take it out of Block mode. Not enough on its own; used together with the audit log.
- **The setting that changed, from the audit log:** Intune's audit log records a settings catalog change without the settings it touched, so a change to one rule cannot be told apart from a change to another. Not possible.
- **Device reports alone for the Rule mode:** closer to what devices run, but it would judge rules that Intune does not manage, while the Suggested policy is an Intune policy. Rejected.

## Consequences

- The audit log needs `DeviceManagementApps.Read.All` (ADR-0002) and, for the User, an Intune role with Audit data: Read.
- Any change to a policy that sets a rule starts its Audit period again, also a change to another rule or to the description. This errs on the side of No evidence.
- Changes to the members of an assigned group are not in the audit log: a device that joined the group recently is in the Coverage but may have been in Audit mode for less than the Audit period.
- A deleted policy is not seen: if it set the rule to Block mode, the rule may have been in Audit mode for less than the Audit period on its devices.
- When Intune and the devices disagree, for example a rule set by Group Policy, the Verdict follows Intune and the Coverage shows what the devices run.
