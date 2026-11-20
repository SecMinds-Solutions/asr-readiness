# Verdicts use Intune's Rule mode, and wait for a source of the Audit period

A Verdict needs to know whether a rule is in Audit mode, and for how long. The app takes the first from the Tenant's Intune policies. For the second it has no source yet.

- **Rule mode:** Intune's Rule mode decides whether a rule gets a Verdict. Block is shown as Already blocking. Audit is judged on its audit events. Not configured, Disabled, Warn and a Conflict give No evidence. When Rule modes differ by group and some groups are in Audit mode, the rule is judged, and the reason says which groups. Every Verdict is shown with its Coverage, the devices that report the rule in Audit mode, because a Verdict speaks only for those devices.
- **Audit period:** the app cannot measure it yet, so every rule that Intune sets to Audit mode and that has Coverage gets No evidence, with a reason that says the Audit period cannot be measured. A rule must also have Coverage; otherwise the Verdict is No evidence. The Verdict logic still checks an Audit period against the Minimum audit period of 14 days once a source provides one.

## Considered Options

- **The Rule modes devices report to advanced hunting** (`DeviceTvmInfoGathering`): the app first measured, per device, since when it had reported Audit every day. On a real Tenant every device had exactly one record in 30 days: the table keeps only each device's latest record, which is enough for Coverage (ADR-0006) but holds no history. Every Audit period came out as 0 days. Dropped.
- **The change date of the Intune policy:** any edit to the policy resets it, and it does not show when devices received the policy or when assignments changed. Rejected.
- **Device reports alone for the Rule mode:** closer to what devices run, but it would judge rules that Intune does not manage, while the Suggested policy is an Intune policy. Rejected.

## Consequences

- Until a source of the Audit period is chosen, no rule is Ready to block or Ready with exclusions, and the Suggested policy has no rules.
- When Intune and the devices disagree, for example a rule set by Group Policy, the Verdict follows Intune and the Coverage shows what the devices run.
