# The User record is taken from the sign-in token and stored by the app's own API

ASR Readiness keeps one thing about a User: the User record, with their Home tenant ID, username, first name, last name, email address and Contact consent with its date. The browser never sends these values. It sends only the User's Contact consent choice, with an access token for the app's own API (the delegated scope `UserRecord.ReadWrite`, see ADR-0002). The API is one Azure Function in West Europe. It accepts a request only when the token's signature, issuer, audience, expiry, version, client and scope all check out. It then takes the other five fields from the token's claims and dates the choice itself. The record is stored in Azure Table Storage in West Europe, keyed by Home tenant and username, and holds exactly those six fields.

A new User makes the Contact consent choice right after their first sign-in, before anything else, with the box unticked. A returning User has a record and is not asked again. The record holds nothing about the Tenants a User analyses, and nothing from an Analysis (ADR-0003).

## Considered Options

- **Sending the User's details from the browser:** this needs no server-side token check, but anyone could store any name or email address, and nothing would prove that the record belongs to the person who signed in. Rejected.
- **Validating the ID token instead of an access token for the app's own scope:** this needs no extra scope, but Microsoft does not support ID tokens for calling APIs, and they do not show that the User consented to the call. Rejected.

## Consequences

- A User's first name, last name or email address can be empty when their account has none. The record keeps what the token carries; the User cannot type it in.
- A User who changes their username in Entra gets a new record at their next sign-in.
- The Home tenant is the token's tenant (`tid`). That holds because the User signs in to their own tenant. A flow that signs in through another tenant, such as a guest account in a customer Tenant, must not store a User record with that token.
- Changing what the User record holds changes this ADR, the README's Trust section and the API's tests together.
