# ASR Readiness

A free, open-source community tool that helps organisations move Microsoft Defender
Attack Surface Reduction (ASR) rules from audit mode to block mode safely.

Sign in with your Entra account, and ASR Readiness reads your tenant's ASR audit events
and Intune ASR policies, gives every rule a verdict, and suggests exclusions and a
ready-made Intune policy that you review and deploy yourself.

> **Status:** in development. Sign-in works; the analysis follows.

## How it works

- **Verdict per rule:** Ready to block, Ready with exclusions, Not ready, or No evidence,
  based on the last 30 days of audit events and with the share of devices it covers.
- **Suggested exclusions:** per rule, never in a location where ordinary users can write files.
- **Suggested policy:** an Intune settings catalog ASR policy as a JSON file to import.
  The tool never changes anything in your tenant.

## Trust

- **Your security data never leaves your browser.** The analysis runs in the browser with
  your own delegated token; nothing about it is sent to or stored by SecMinds.
- **Read-only, delegated permissions only:** `ThreatHunting.Read.All` and
  `DeviceManagementConfiguration.Read.All`, used only while you are signed in and limited
  to what your own roles allow.
- **Sign-in with Microsoft:** you sign in on Microsoft's own sign-in page. Your sign-in tokens
  are kept in the browser tab's session storage and are gone when you close the tab. This
  includes a refresh token (`offline_access`) that renews them while the tab is open. The app
  has no client secret or certificate.
- **Stored about you:** your tenant ID, username, first and last name, email address, and
  whether you agreed to hear from SecMinds about other products.
- **Hosted on Azure.** The web page is served from Azure's global network; the backend that
  stores the User record runs in West Europe.

## Requirements

- Microsoft Defender for Endpoint Plan 2 (also included in Microsoft 365 E5 and the
  Defender Suite add-on for Business Premium). Defender for Business is not supported
  because it has no advanced hunting; see [ADR-0001](docs/adr/0001-defender-for-endpoint-plan-2-only.md).
- A one-time admin consent for the app in your tenant.
- A Defender role that allows advanced hunting and an Intune role that can read
  configuration policies.

MSPs can analyse customer tenants through GDAP.

## Documentation

- [`CONTEXT.md`](CONTEXT.md): the domain language
- [`docs/adr/`](docs/adr/): architecture decisions
- [`CONTRIBUTING.md`](CONTRIBUTING.md): how to report bugs, ideas and vulnerabilities

## Development

```bash
npm ci
npm run dev
```

To sign in locally, copy `.env.example` to `.env.local` and set `VITE_ENTRA_CLIENT_ID` to the
client ID of an app registration of your own, as described in `.env.example`.

Checks: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.

## License

The source code is licensed under the [MIT licence](LICENSE). SecMinds logos, the SecMinds
name and other brand assets (including the logo and favicons in this repository) are not
covered by the MIT licence and may not be used without permission.
