import type { UserRecord } from './client';
import { USER_RECORDS_CSV_TYPE, userRecordsCsv, userRecordsCsvFileName } from './csv';

const ada: UserRecord = {
  homeTenantId: '11111111-1111-1111-1111-111111111111',
  username: 'ada@contoso.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@contoso.com',
  contactConsent: true,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
};

const BOM = '\uFEFF';
const HEADER = 'Home tenant ID,Username,First name,Last name,Email address,Contact consent,Contact consent date';

describe('userRecordsCsv', () => {
  it('starts with a BOM and a header, then one row per User in the seven columns, with CRLF line ends', () => {
    expect(userRecordsCsv([ada, { ...ada, username: 'alan@contoso.com', contactConsent: false }])).toBe(
      `${BOM}${HEADER}\r\n` +
        '11111111-1111-1111-1111-111111111111,ada@contoso.com,Ada,Lovelace,ada@contoso.com,yes,2026-11-17T10:00:00.000Z\r\n' +
        '11111111-1111-1111-1111-111111111111,alan@contoso.com,Ada,Lovelace,ada@contoso.com,no,2026-11-17T10:00:00.000Z\r\n',
    );
  });

  it('holds only the header without records', () => {
    expect(userRecordsCsv([])).toBe(`${BOM}${HEADER}\r\n`);
  });

  it.each([
    ['=HYPERLINK("http://evil.example")', `"'=HYPERLINK(""http://evil.example"")"`],
    ['+1+1', "'+1+1"],
    ['-2+3', "'-2+3"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['\t=1+1', "'\t=1+1"],
    ['\r=1+1', `"'\r=1+1"`],
  ])('keeps Excel from running %s as a formula', (firstName, cell) => {
    expect(userRecordsCsv([{ ...ada, firstName }]).split('\r\n')[1]).toContain(`,${cell},Lovelace,`);
  });

  it.each([
    ['a comma', 'Lovelace, Countess', '"Lovelace, Countess"'],
    ['a quote', 'O"Brien', '"O""Brien"'],
    ['a line break', 'Love\nlace', '"Love\nlace"'],
    ['a carriage return', 'Love\rlace', '"Love\rlace"'],
  ])('quotes a value with %s', (_, lastName, cell) => {
    expect(userRecordsCsv([{ ...ada, lastName }])).toContain(`,Ada,${cell},`);
  });

  it('keeps accented names as they are', () => {
    expect(userRecordsCsv([{ ...ada, firstName: 'Zoë', lastName: 'Ångström' }])).toContain(',Zoë,Ångström,');
  });
});

describe('userRecordsCsvFileName', () => {
  it('names the file after the local date', () => {
    expect(userRecordsCsvFileName(new Date(2026, 10, 18, 23, 30))).toBe('asr-compass-users-2026-11-18.csv');
  });
});

describe('USER_RECORDS_CSV_TYPE', () => {
  it('is UTF-8 CSV', () => {
    expect(USER_RECORDS_CSV_TYPE).toBe('text/csv;charset=utf-8');
  });
});
