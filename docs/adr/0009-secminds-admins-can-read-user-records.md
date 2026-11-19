# SecMinds admins can read every User record

SecMinds needs to see who uses ASR Compass and who agreed to hear about its other products. A small number of SecMinds admins can therefore open an admin page in the app that lists every User record, with its six fields. They can narrow the list to Users with Contact consent and see how many Users there are, in total, with Contact consent and per Home tenant. They can download the records shown as a CSV file, made in the browser. They cannot change or delete another User's record; each User deletes their own (see the privacy notice).

Who is an admin is decided by the API from the validated access token: the User must have the app's **Admin** role, assigned in SecMinds' own tenant. An email address in the token is never enough, because any tenant can create a user with any email address. Everyone else gets "not allowed", and the page's link is only shown to admins.

The admin page reads only the User records. It never shows anything about Analyses, which are never stored (ADR-0003).

## Considered Options

- **No admin page; read the table with storage tools when needed:** every lookup would need access to the storage itself, which is broader than reading User records. Rejected.
- **Admins may also delete or change records:** not needed, since Users delete their own record, and it would add a write path for other people's data. Rejected for now.

## Consequences

- The privacy notice says that SecMinds admins can see User records, list those with Contact consent and export them.
- Adding or removing an admin needs no change to the app.
- An exported file leaves the app: SecMinds keeps it only as long as it needs it for the email it was made for.
- Names and email addresses come from Entra and any tenant can set them, so the export keeps spreadsheet apps from running a value as a formula.
