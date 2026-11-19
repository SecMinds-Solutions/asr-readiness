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
- A button in the navbar switches between light and dark mode. Without a choice the app follows the system setting; the choice is remembered in the browser's local storage, and only for the visit when the browser does not allow that.
- Admin page for SecMinds admins: a list of every User record, at `#admin`, with the navbar link shown only to admins. The API's read-only `GET /api/users` returns the records only to a User with the app role Admin assigned in SecMinds' own tenant; everyone else gets "not allowed". The privacy notice says who can see the records. ADR-0009 records the decision.
- Admin page: counts of all Users, Users with Contact consent and Users per Home tenant, and a filter that shows only Users with Contact consent. Filtering and counting happen in the browser on the records already read.
- Admin page: a CSV download of the User records shown (all, or only those with Contact consent), UTF-8 with a BOM and the date in the file name. Values that start like a spreadsheet formula are exported as text. The privacy notice says admins can export the records.
- `.env.example` with `VITE_ENTRA_CLIENT_ID`, the client ID of the app registration to sign in with.
- A website at `asrcompass.cloud` and the app at `app.asrcompass.cloud`, from one build: the page picks the website or the app by its hostname, and any other hostname shows the app. The website has a home page and the privacy notice at `/privacy`; the app has `/`, `/settings` and `/admin`. A page of the other half redirects there, unknown paths go to the home page, and the old `#privacy` and `#admin` links still work. Locally the website is at `/` and the app under `/app`. `VITE_SITE_ORIGIN` and `VITE_APP_ORIGIN` set the two origins; see `.env.example`.
- The website loads no sign-in code and sets no cookies, analytics or third-party scripts; only the app signs you in. ADR-0010 records the decision, and the README's Trust section and the privacy notice say so.
- A landing page on the website: what ASR Compass does, why ASR rules stay in Audit mode, who it is for, five steps to get started with the admin consent link, the trust promises and an FAQ, with an example Verdict table of fictitious data.
- "Get started – sign in with Microsoft" on the website starts sign-in at once: it opens the app with `?sign-in`, and the app goes straight to Microsoft's sign-in page for a User who is not signed in. Opened any other way, the app still shows its sign-in card and waits.
- A footer on the website and the app with the privacy notice, the source code on GitHub, the copyright and the licence.
- A user menu in the app's header, with the signed-in User's name and email address, Settings, Admin (for admins only), the privacy notice and Sign out. It works with the keyboard and screen readers.
- Settings in the app: see your User record, withdraw or give your Contact consent, and delete your User record.

### Changed

- The signed-in app has a sidebar and a page per part of the Analysis instead of tabs: Overview (`/`), Verdicts (`/verdicts`), Suggested policy (`/policy`), ASR rules (`/rules`) and Audit events (`/events`), with Settings, and for SecMinds admins the admin pages (`/admin`, `/admin/users`). The sidebar collapses behind a Menu button on narrow screens. The Analysis is still read once: moving between pages never reads Microsoft Graph again.
- The Overview shows the Analysis at a glance: the devices that report their Rule modes, and the number of ASR rules per Verdict (and Already blocking) with the Coverage they speak for. Each tile opens the Verdicts filtered to that Verdict. A Next step points to the Suggested policy when a rule is ready, or says what a rule needs to become ready.
- The Verdicts have a filter per Verdict with its number of rules. The filter is kept in the address (`/verdicts?verdict=ready-to-block`), so reload, Back and shared links keep it; an unknown value shows every rule.
- A Tenant status bar at the top of every page of the Analysis shows the Tenant, the number of devices, the Observation window, when the Analysis was read, and Read again, which reads every part again. It replaces the "Signed in" and "Ready for an Analysis" cards. The onboarding check runs when a page of the Analysis is first opened, and while the Tenant is not ready, those pages show why, with Settings still in reach.
- The user menu button shows the User's avatar and name. The design system is updated to the version with the grouped sidebar and the app layout.
- The header of the website and the app stays at the top of the window while the page scrolls, so the user menu and the other header actions are always within reach. Links to a section of a page leave room for it.
- The app's header shows the logo, ASR Compass and a Preview badge, a sun or moon icon to switch the theme and the user menu, instead of text links and a "Dark mode" button. Signed out, it shows a compact sign-in card with a link to "What is ASR Compass?" on the website.
- The User record moved from the privacy notice to Settings; the privacy notice is a page of the website and shows only the notice.

- The app is renamed to **ASR Compass**: its pages, documentation, privacy notice, the name shown on Microsoft's consent screen, and the downloaded files (`asr-compass-suggested-policy-<date>.json`, whose policy is named "ASR Compass suggested policy <date>", and `asr-compass-users-<date>.csv`). A light or dark choice made before the rename still applies.
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

- The user menu listed Settings, Admin, Privacy notice and Sign out next to each other instead of below each other, because the navigation bar's link styles also applied to it. The user menu is now the design system's menu: its items sit below each other, with a divider before Sign out.
- The onboarding check said "Your Tenant could not be checked" when Intune refused to read its policies, because Intune does not always answer a refusal with HTTP 403. It now says access is needed, names the Intune role to assign and shows Intune's own message instead of its raw error.
- "Check again" and "Try again" in the onboarding check first get a new Microsoft Graph token, so a Microsoft Entra role (such as Security Reader) assigned after sign-in counts without signing out and in again. Roles assigned in Intune or the Microsoft Defender portal do not depend on the token; Microsoft can take a while to apply them.
- When only the Coverage query fails (for example because the User may read Intune but not the Rule modes devices report, or the advanced hunting quota is used up), the ASR rules overview still shows the Rule modes from Intune, with the reason Coverage is missing and a Try again, instead of failing as a whole.
