# Analyses are never stored

An Analysis is computed on request in the User's browser (see ADR-0004), shown to the User and discarded; it is never sent to SecMinds. Neither raw audit events nor aggregated results (Verdicts, paths, counts, Suggested exclusions) are persisted; the only stored data is the User record: Home tenant, username, first name, last name, email address and Contact consent (ADR-0005). This is a public trust promise of the tool, which is why it is hard to reverse: storing results later would need new consent and would break what users were told.

## Consequences

- No history between Analyses, no trend over time and no MSP overview across Tenants.
- Audit event paths can contain personal data such as user names; because nothing is stored, they never need to be anonymised at rest.
