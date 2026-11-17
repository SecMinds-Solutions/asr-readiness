# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- `CONTEXT.md` with the domain language (Analysis, Verdict, Coverage, Suggested exclusion, Suggested policy, User, Home tenant, Contact consent, and more).
- Architecture decisions: Defender for Endpoint Plan 2 only (ADR-0001), delegated permissions only (ADR-0002), analyses are never stored (ADR-0003), analyses run entirely in the browser (ADR-0004).
- README with the tool's purpose, trust model and requirements; `CONTRIBUTING.md`; MIT licence.

- App skeleton: a single-page app built with Vite, React and TypeScript, styled with the SecMinds Solutions design system, with light and dark themes that follow the system setting.
- Security headers for the hosted app, including a strict Content-Security-Policy.
- Lint, type check, test and build commands.
- Sign-in with a work or school account from any tenant, through Microsoft's sign-in page (MSAL.js, tokens in session storage). The app shows the signed-in User's name, username and Home tenant, and lets them sign out.
- Admin consent: admins can open the admin consent page from the app, and a User whose tenant has not consented yet is told to ask an admin, with the link to send them.
- User record with Contact consent: after the first sign-in, a User chooses, before anything else and with the box unticked, whether SecMinds may email them about its other products. A returning User is not asked again.
- An API (`api/`) that stores the User record: it validates the access token's signature, issuer, audience, expiry, version, client and scope, takes the Home tenant, username, first and last name and email address from the token, and stores exactly those six fields with the Contact consent and its date in Azure Table Storage.
- ADR-0005: the User record is taken from the sign-in token and stored by the app's own API.
- `.env.example` with `VITE_ENTRA_CLIENT_ID`, the client ID of the app registration to sign in with.

### Changed

- README: development commands, a precise description of where the app is hosted, and a note that SecMinds brand assets are not covered by the MIT licence.

- `.gitignore`: removed an ignore pattern that does not apply to files in this repository.
- Content-Security-Policy: allows connections to the Microsoft identity platform (`login.microsoftonline.com`) for sign-in.
- README: sign-in in the Trust section, and how to sign in during local development.
- ADR-0002 lists the six delegated permissions and explains the `offline_access` scope MSAL.js adds at sign-in for a refresh token, and the app's own `UserRecord.ReadWrite` scope.
- ADR-0003 names the Home tenant as the tenant stored in the User record.
- README: the Trust section lists exactly what the User record holds and where it is stored.
