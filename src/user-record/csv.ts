// The CSV export of User records for SecMinds admins. Pure: no network, storage or React.
import { localDate } from '../localDate';
import type { UserRecord } from './client';

export const USER_RECORDS_CSV_TYPE = 'text/csv;charset=utf-8';

const COLUMNS: readonly { header: string; value: (user: UserRecord) => string }[] = [
  { header: 'Home tenant ID', value: (user) => user.homeTenantId },
  { header: 'Username', value: (user) => user.username },
  { header: 'First name', value: (user) => user.firstName },
  { header: 'Last name', value: (user) => user.lastName },
  { header: 'Email address', value: (user) => user.email },
  { header: 'Contact consent', value: (user) => (user.contactConsent ? 'yes' : 'no') },
  { header: 'Contact consent date', value: (user) => user.contactConsentDate },
];

/**
 * One CSV cell. Names and email addresses come from Entra and any tenant can set them, so a value
 * that starts like a formula (=, +, -, @, a tab or a carriage return) gets a leading ' and
 * spreadsheet apps show it as text. Values with a
 * comma, quote or line break are quoted, with quotes doubled (RFC 4180).
 */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The User records as CSV: UTF-8 with a BOM so Excel shows accents, a header row, CRLF line ends. */
export function userRecordsCsv(users: readonly UserRecord[]): string {
  const lines = [COLUMNS.map((column) => column.header), ...users.map((user) => COLUMNS.map((column) => cell(column.value(user))))];
  return `\uFEFF${lines.map((line) => line.join(',')).join('\r\n')}\r\n`;
}

/** The file name, with the admin's local date. */
export const userRecordsCsvFileName = (date: Date): string => `asr-compas-users-${localDate(date)}.csv`;
