# The website has no sign-in, cookies, analytics or third-party scripts

ASR Compass has a public website that explains what the tool does, its trust promises and how to start, and the app itself, which signs Users in and runs the Analysis. They have separate addresses: the website on `asrcompass.cloud`, the app on `app.asrcompass.cloud`.

The website loads no sign-in code. The sign-in library (MSAL.js), the code that calls Microsoft Graph and the client of the User record API are only loaded by the app; the website's code does not import them, and a test follows its imports to keep it that way. A visitor who only reads about the tool makes no request to Microsoft's sign-in service, gets no token and has no User record. The website sets no cookies and uses no analytics, trackers or third-party scripts. The only thing it keeps in the browser is the visitor's light or dark mode choice, in local storage, as the app does.

Links on the website to start, including the admin consent link, are plain links: to the app, which signs the User in on Microsoft's sign-in page, or to Microsoft's admin consent page, which returns to the app.

## Considered Options

- **The app and the website on one address, the app under a path:** the website would share its origin with the app's token cache and sign-in code. Rejected.
- **Sign in straight from the website:** it would load the sign-in library for every visitor, also for those who only read. Rejected.
- **Analytics on the website, to see where visitors come from:** a tracker on the page that introduces a tool whose promise is that security data stays in the browser undermines that promise. Rejected.

## Consequences

- Only the app signs Users in; the website's "Get started" and "Open app" links lead there.
- Pages of the app opened on the website's address, and the other way round, redirect to the right address.
- The README's Trust section and the privacy notice state this promise.
- Adding sign-in, cookies, analytics or a third-party script to the website reopens this decision.
