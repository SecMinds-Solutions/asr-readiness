# Analyses run entirely in the browser

The app is a static single-page app (Vite, React, TypeScript) on Azure Static Web Apps in West Europe. The User signs in with MSAL.js, and the browser calls Microsoft Graph directly with the User's delegated token, computes the Verdicts and builds the Suggested policy as a download. A Tenant's security data therefore never reaches a SecMinds server. The only backend is one Azure Function that validates the sign-in token and stores the User record in Azure Table Storage.

## Considered Options

- A server-rendered app (Next.js on App Service with PostgreSQL): it needs a server that receives tokens and security data, and a database for one table.

## Consequences

- An Analysis must fit in the browser: advanced hunting queries aggregate per rule, application and path instead of returning raw events (Graph returns at most 100,000 rows).
- "Your security data never leaves your browser" is verifiable in the public source code; adding server-side processing later breaks that promise.
