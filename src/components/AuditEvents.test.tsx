import { render, screen, within } from '@testing-library/react';
import { auditEventsFromRows } from '../analysis/auditEvents';
import { FOLDER, groupsResult, totalsResult } from '../analysis/fixtures/huntingResults';
import { AuditEventsView } from './AuditEvents';

const office = (...rows: { Application: string; Path: string; Events: number; Devices: number }[]) =>
  groupsResult(...rows.map((row) => ({ ActionType: 'AsrOfficeChildProcessAudited', ...row }))).results;

const officeTotals = (Events: number, Groups: number) =>
  totalsResult({ ActionType: 'AsrOfficeChildProcessAudited', Events, Groups }).results;

const rowOf = (name: string) => screen.getAllByRole('cell', { name })[0]?.closest('tr') as HTMLElement;

describe('AuditEventsView', () => {
  it('lists every rule with its Audit events in the Observation window', () => {
    render(
      <AuditEventsView
        events={auditEventsFromRows(officeTotals(42, 2), office(
          { Application: 'WINWORD.EXE', Path: 'C:\\Program Files\\Contoso\\addin.exe', Events: 40, Devices: 9 },
          { Application: 'EXCEL.EXE', Path: 'C:\\Windows\\System32\\cmd.exe', Events: 2, Devices: 1 },
        ))}
      />,
    );
    expect(screen.getByText(/^Audit events in the last 30 days, per ASR rule, application and path/)).toBeInTheDocument();
    const summary = rowOf('Block all Office applications from creating child processes');
    expect(within(summary).getByText('42')).toBeInTheDocument();
    expect(within(summary).getByText('2')).toBeInTheDocument();
    expect(within(rowOf('Block credential stealing from the Windows local security authority subsystem')).getByText('None')).toBeInTheDocument();
  });

  it('shows the Audit events per application and path of a rule that has them', () => {
    render(
      <AuditEventsView
        events={auditEventsFromRows(officeTotals(40, 1), office({ Application: 'WINWORD.EXE', Path: 'C:\\Program Files\\Contoso\\addin.exe', Events: 40, Devices: 9 }))}
      />,
    );
    expect(screen.getByText('Block all Office applications from creating child processes: 40 Audit events')).toBeInTheDocument();
    const group = rowOf('C:\\Program Files\\Contoso\\addin.exe');
    expect(within(group).getByText('WINWORD.EXE')).toBeInTheDocument();
    expect(within(group).getByText(FOLDER)).toBeInTheDocument();
    expect(within(group).getByText('40')).toBeInTheDocument();
    expect(within(group).getByText('9')).toBeInTheDocument();
  });

  it('renders a path as text, never as HTML', () => {
    const path = 'C:\\Users\\x\\<img src=x onerror=alert(1)>.exe';
    const { container } = render(
      <AuditEventsView events={auditEventsFromRows(officeTotals(1, 1), office({ Application: '<b>bold</b>', Path: path, Events: 1, Devices: 1 }))} />,
    );
    expect(screen.getByText(path)).toBeInTheDocument();
    expect(screen.getByText('<b>bold</b>')).toBeInTheDocument();
    expect(container.querySelector('img, b')).toBeNull();
  });

  it('names an empty application or path as unknown', () => {
    render(<AuditEventsView events={auditEventsFromRows(officeTotals(1, 1), office({ Application: '', Path: '', Events: 1, Devices: 1 }))} />);
    expect(screen.getAllByText('Unknown')).toHaveLength(2);
  });

  it('warns when a rule has more groups than advanced hunting returned', () => {
    render(
      <AuditEventsView events={auditEventsFromRows(officeTotals(50, 3), office({ Application: 'a.exe', Path: 'C:\\a.exe', Events: 40, Devices: 1 }))} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Not every application and path.*Block all Office applications from creating child processes.*more than 500/,
    );
    expect(screen.getByText(/1 of 3 applications and paths/)).toBeInTheDocument();
  });

  it('shows the 25 largest groups of a rule and says how many more there are', () => {
    const rows = Array.from({ length: 30 }, (_, n) => ({ Application: `app${n}.exe`, Path: `C:\\p${n}.exe`, Events: 100 - n, Devices: 1 }));
    render(<AuditEventsView events={auditEventsFromRows(officeTotals(rows.reduce((sum, row) => sum + row.Events, 0), 30), office(...rows))} />);
    expect(screen.getByText('app24.exe')).toBeInTheDocument();
    expect(screen.queryByText('app25.exe')).toBeNull();
    expect(screen.getByText(/25 of 30 applications and paths/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says when no rule has Audit events', () => {
    render(<AuditEventsView events={auditEventsFromRows([], [])} />);
    expect(screen.getByText('No Audit events in the last 30 days')).toBeInTheDocument();
  });

  it('names the rules whose Audit events advanced hunting does not record', () => {
    render(<AuditEventsView events={auditEventsFromRows([], [])} />);
    expect(screen.getByText(/Block Webshell creation for Servers/)).toBeInTheDocument();
  });
});
