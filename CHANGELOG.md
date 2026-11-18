# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- `CONTEXT.md` with the domain language (Analysis, Verdict, Coverage, Suggested exclusion, Suggested policy, User, Home tenant, Contact consent, and more).
- Architecture decisions: Defender for Endpoint Plan 2 only (ADR-0001), delegated permissions only (ADR-0002), analyses are never stored (ADR-0003), analyses run entirely in the browser (ADR-0004).
- ADR-0006: Coverage comes from the Rule mode each device reports to advanced hunting.
- README with the tool's purpose, trust model and requirements; `CONTRIBUTING.md`; MIT licence.

- App skeleton: a single-page app built with Vite, React and TypeScript, styled with the SecMinds Solutions design system, with light and dark themes that follow the system setting.
- Security headers for the hosted app, including a strict Content-Security-Policy.
- Lint, type check, test and build commands.
- Sign-in with a work or school account from any tenant, through Microsoft's sign-in page (MSAL.js, tokens in session storage). The app shows the signed-in User's name, username and Home tenant, and lets them sign out.
- Admin consent: admins can open the admin consent page from the app, and a User whose tenant has not consented yet is told to ask an admin, with the link to send them.
- User record with Contact consent: after the first sign-in, a User chooses, before anything else and with the box unticked, whether SecMinds may email them about its other products. A returning User is not asked again.
- An API (`api/`) that stores the User record: it validates the access token's signature, issuer, audience, expiry, version, client and scope, takes the Home tenant, username, first and last name and email address from the token, and stores exactly those six fields with the Contact consent and its date in Azure Table Storage.
- ADR-0005: the User record is taken from the sign-in token and stored by the app's own API.
- Onboarding check after sign-in: one small advanced hunting query and one Intune read decide whether the Tenant is a Supported tenant and the User has the roles an Analysis needs. A Tenant without Defender for Endpoint data in advanced hunting gets a page that explains Plan 2 and why Defender for Business is not supported; a Tenant without onboarded devices is told there is nothing to analyse yet; a User missing a role is told which one and where to assign it.
- ASR rules overview after onboarding: every ASR rule in the catalogue with its Rule mode from the Tenant's assigned Intune settings catalog policies, a clear conflict state when policies set different Rule modes, and a note on unassigned policies and unrecognised settings.
- Coverage per ASR rule as "n of m devices": the devices on which the rule is in Audit mode, out of the devices that report their Rule modes to advanced hunting, counted in KQL (ADR-0006). Coverage includes every reporting device, whatever manages it; devices without Intune management cannot be identified or shown separately with the app's permissions, and the app says so.
- The ASR rule catalogue: the 19 ASR rules with their GUIDs and names from Microsoft's ASR rules reference, in one place, and the advanced hunting action type of each rule's Audit events.
- Audit events per ASR rule, application (with its folder) and path over the last 30 days (the Observation window), counted in advanced hunting with two aggregating queries; the events themselves are never downloaded. Advanced hunting returns at most 500 applications and paths per rule; a rule whose applications and paths do not account for all its Audit events is flagged. A throttled advanced hunting quota and a query that takes longer than 5 minutes are reported with a request to try again later, and the rule that advanced hunting records no Audit events for (Block Webshell creation for Servers) is named.
- Verdicts: every ASR rule gets Ready to block, Ready with exclusions, Not ready or No evidence, or shows as Already blocking, with its Coverage and the reason. A rule must have been in Audit mode for at least 14 days on every device that reports it in Audit mode, read from the Rule modes devices report to advanced hunting. Ready with exclusions needs all Audit events of the last 30 days to come from at most 5 paths, none in a User-writable location. ADR-0007 records where the Rule mode and the Audit period come from.
- Suggested policy: under the Verdicts, the rules that are Ready to block or Ready with exclusions with their Suggested exclusions, and a download of an Intune settings catalog policy as JSON that sets those rules to Block with their per-rule exclusions and leaves every other rule out. The page explains how to import and assign it, advises a pilot group first, and warns that a device that also gets a policy setting those rules to Audit mode has a Conflict. The policy is never offered with a Suggested exclusion in a User-writable location. ADR-0008 records why the policy holds only the rules that are ready.
- Privacy notice: a page linked from every page, and `PRIVACY.md`, describing what is stored about a User, why, where (West Europe, in the EU) and for how long, and how to exercise their rights. The README's Trust section links to it.
- A signed-in User can see their stored User record on the privacy notice, withdraw or give their Contact consent (stored with the date of the new choice), and delete their User record after a confirmation. The API's `GET /api/user` now returns the whole User record of the signed-in User, and `DELETE /api/user` removes it from storage. After deleting, the app offers only sign-out.
- `.env.example` with `VITE_ENTRA_CLIENT_ID`, the client ID of the app registration to sign in with.

### Changed

- Verdicts: a rule is Not ready when the application that triggered an Audit event runs from a User-writable location, or from a folder advanced hunting does not record, also for rules whose exclusion would name the file the rule acts on. A Not ready reason names the kind of User-writable location, such as the Downloads folder or ProgramData.
- ASR rules overview: Intune policies that set different Rule modes are a Conflict only when they share an assignment target (the same group, All devices or All users). Policies on different groups now show as Differs by group, with each Rule mode and its group, without the danger tone and without counting towards the conflict warning. `CONTEXT.md` defines both terms.
- README: development commands, a precise description of where the app is hosted, and a note that SecMinds brand assets are not covered by the MIT licence.

- `.gitignore`: removed an ignore pattern that does not apply to files in this repository.
- Content-Security-Policy: allows connections to the Microsoft identity platform (`login.microsoftonline.com`) for sign-in and to Microsoft Graph (`graph.microsoft.com`) for advanced hunting and Intune reads.
- README: sign-in in the Trust section, and how to sign in during local development.
- ADR-0002 lists the six delegated permissions and explains the `offline_access` scope MSAL.js adds at sign-in for a refresh token, and the app's own `UserRecord.ReadWrite` scope.
- ADR-0003 names the Home tenant as the tenant stored in the User record.
- README: the Trust section lists exactly what the User record holds and where it is stored.
- README: the requirements name the Defender and Intune roles a User needs.
- ADR-0001 describes how onboarding detects a Supported tenant without reading licences.

### Fixed

- The onboarding check said "Your Tenant could not be checked" when Intune refused to read its policies, because Intune does not always answer a refusal with HTTP 403. It now says access is needed, names the Intune role to assign and shows Intune's own message instead of its raw error.
- "Check again" and "Try again" in the onboarding check first get a new Microsoft Graph token, so a Microsoft Entra role (such as Security Reader) assigned after sign-in counts without signing out and in again. Roles assigned in Intune or the Microsoft Defender portal do not depend on the token; Microsoft can take a while to apply them.
- When only the Coverage query fails (for example because the User may read Intune but not the Rule modes devices report, or the advanced hunting quota is used up), the ASR rules overview still shows the Rule modes from Intune, with the reason Coverage is missing and a Try again, instead of failing as a whole.
