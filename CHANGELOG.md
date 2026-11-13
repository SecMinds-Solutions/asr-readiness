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

### Changed

- README: development commands, a precise description of where the app is hosted, and a note that SecMinds brand assets are not covered by the MIT licence.

- `.gitignore`: removed an ignore pattern that does not apply to files in this repository.
