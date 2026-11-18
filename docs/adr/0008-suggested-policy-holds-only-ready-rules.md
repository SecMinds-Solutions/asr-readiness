# The Suggested policy holds only the rules that are ready

The Suggested policy is an Intune settings catalog policy that the User downloads as JSON, imports in the Intune admin center, and assigns and deploys themselves. ASR Compas never writes to the Tenant (ADR-0002). The policy holds one "Attack Surface Reduction Rules" setting with only the rules whose Verdict is Ready to block or Ready with exclusions, each set to Block, and each Ready with exclusions rule with its Suggested exclusions as that rule's own exclusions (per-rule exclusions). Every other rule is left out of the policy, so the Tenant's own policies keep setting it.

## Considered Options

- **A full replacement policy:** every rule as Intune sets it now, with the ready rules changed to Block, meant to replace the Tenant's ASR policy. A rule whose Rule modes differ by group or conflict has no single Rule mode to copy, and exclusions in the Tenant's policies would be lost unless the app also read and copied them. Rejected.
- **Exclusions for all rules** (the ASR-only exclusions setting): an exclusion would then let a file through every rule, not only the rule whose Audit events it explains. Rejected.

## Consequences

- A device that gets both the Suggested policy and a policy that sets the same rule to Audit mode has a Conflict, and Intune applies neither Rule mode. The page says so, and tells the User to remove those rules from their Audit policies or exclude the pilot group from them, and that excluding the group also removes the other rules in those policies from the pilot devices.
- The page advises assigning the policy to a pilot group of devices first.
- The policy is built from the Verdicts alone. It checks again that a Ready with exclusions rule has Suggested exclusions and that none is in a User-writable location, and offers no policy when either check fails.
- The JSON follows the shape Intune exports a settings catalog policy in. If Microsoft changes that import format, the download has to follow.
