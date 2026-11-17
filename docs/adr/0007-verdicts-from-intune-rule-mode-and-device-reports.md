# Verdicts use Intune's Rule mode and the Audit period devices report

A Verdict needs to know whether a rule is in Audit mode, and for how long. The app takes the first from the Tenant's Intune policies and the second from what devices report to advanced hunting.

- **Rule mode:** Intune's Rule mode decides whether a rule gets a Verdict. Block is shown as Already blocking. Audit is judged on its audit events. Not configured, Disabled, Warn and a Conflict give No evidence. When Rule modes differ by group and some groups are in Audit mode, the rule is judged, and the reason says which groups. Every Verdict is shown with its Coverage, the devices that report the rule in Audit mode, because a Verdict speaks only for those devices.
- **Audit period:** advanced hunting's `DeviceTvmInfoGathering` holds each device's reported Rule modes for the last 30 days (see ADR-0006). For every device whose latest day of reports has a rule in Audit mode, one query finds since when it has reported Audit every day without a break: a day with any other Rule mode, or more than 3 days between two reports, starts the count again, and the count ends at the device's last report. The shortest of those periods is the rule's Audit period and must reach the Minimum audit period of 14 days. Only the number of devices and the shortest period per rule reach the browser. A device whose latest report has just switched to Audit mode counts with 0 days. A rule must also have Coverage, and the Audit period must cover every device Coverage counts in Audit mode; otherwise the Verdict is No evidence.

## Considered Options

- **The change date of the Intune policy:** any edit to the policy resets it, and it does not show when devices received the policy or when assignments changed. Rejected.
- **Device reports alone for the Rule mode:** closer to what devices run, but it would judge rules that Intune does not manage, while the Suggested policy is an Intune policy. Rejected.

## Consequences

- A device that has just started reporting a rule in Audit mode, such as a newly onboarded one, keeps the rule at No evidence until it has reported Audit for 14 days.
- An Audit period cannot be longer than the 30 days advanced hunting keeps.
- When Intune and the devices disagree, for example a rule set by Group Policy, the Verdict follows Intune and the Coverage shows what the devices run.
