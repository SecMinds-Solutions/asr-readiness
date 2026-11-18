import { fireEvent, render, screen, within } from '@testing-library/react';
import { ASR_RULES } from '../analysis/asrRules';
import type { RuleAssessment } from '../analysis/verdicts';
import { saveInBrowser, SuggestedPolicyView } from './SuggestedPolicy';

const [drivers, lsass, wmi] = ASR_RULES as [(typeof ASR_RULES)[number], (typeof ASR_RULES)[number], (typeof ASR_RULES)[number]];
const coverage = { auditDevices: 40, devices: 50 };

const assessments: RuleAssessment[] = [
  { kind: 'verdict', rule: drivers, verdict: 'Not ready', reason: 'r', paths: [], coverage },
  { kind: 'verdict', rule: lsass, verdict: 'Ready with exclusions', reason: 'r', paths: ['C:\\Program Files\\<b>Contoso</b>\\agent.exe'], coverage },
  { kind: 'verdict', rule: wmi, verdict: 'Ready to block', reason: 'r', paths: [], coverage },
];

const rowOf = (name: string) => screen.getByRole('cell', { name }).closest('tr') as HTMLElement;

describe('SuggestedPolicyView', () => {
  it('lists the rules it sets to Block with their Suggested exclusions as text, and not the rules that are not ready', () => {
    const { container } = render(<SuggestedPolicyView assessments={assessments} saveFile={vi.fn()} />);
    expect(within(rowOf(lsass.name)).getByText('C:\\Program Files\\<b>Contoso</b>\\agent.exe')).toBeInTheDocument();
    expect(within(rowOf(wmi.name)).getByText('None')).toBeInTheDocument();
    expect(within(rowOf(wmi.name)).getByText('Ready to block')).toBeInTheDocument();
    expect(within(rowOf(wmi.name)).getByText('40 of 50 devices')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: drivers.name })).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('downloads the Suggested policy as JSON with the ready rules set to Block', () => {
    const saveFile = vi.fn();
    render(<SuggestedPolicyView assessments={assessments} saveFile={saveFile} />);
    fireEvent.click(screen.getByRole('button', { name: /Download Suggested policy/ }));
    expect(saveFile).toHaveBeenCalledTimes(1);
    const [fileName, contents] = saveFile.mock.calls[0] as [string, string];
    expect(fileName).toMatch(/^asr-readiness-suggested-policy-\d{4}-\d{2}-\d{2}\.json$/);
    const json = JSON.parse(contents) as { platforms: string };
    expect(json.platforms).toBe('windows10');
    expect(contents).toContain(`${wmi.intuneSetting}_block`);
    expect(contents).toContain(`${lsass.intuneSetting}_block`);
    expect(contents).not.toContain(drivers.intuneSetting);
  });

  it('explains how to import and assign the policy, advises a pilot group first and warns about a Conflict', () => {
    render(<SuggestedPolicyView assessments={assessments} saveFile={vi.fn()} />);
    expect(screen.getByText(/Import policy/)).toBeInTheDocument();
    expect(screen.getByText(/pilot group of devices first/)).toBeInTheDocument();
    expect(screen.getByText(/Intune sees a Conflict and applies neither Rule mode/)).toBeInTheDocument();
  });

  it('says there is no Suggested policy yet when no rule is ready', () => {
    render(<SuggestedPolicyView assessments={[assessments[0] as RuleAssessment]} saveFile={vi.fn()} />);
    expect(screen.getByText('No Suggested policy yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).toBeNull();
  });

  it('offers no download when a Suggested exclusion is in a User-writable location', () => {
    const unsafe: RuleAssessment[] = [
      { kind: 'verdict', rule: lsass, verdict: 'Ready with exclusions', reason: 'r', paths: ['C:\\Users\\alex\\AppData\\agent.exe'], coverage },
    ];
    render(<SuggestedPolicyView assessments={unsafe} saveFile={vi.fn()} />);
    expect(screen.getByText(/could not be made/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).toBeNull();
  });
});

describe('saveInBrowser', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('saves the contents as a JSON file under its name, and frees the object URL only after the download started', async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:policy');
    const revokeObjectURL = vi.fn<(url: string) => void>();
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    let clicked: { href: string; download: string; attached: boolean } | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { href: this.href, download: this.download, attached: document.body.contains(this) };
    });

    saveInBrowser('policy.json', '{"name":"x"}\n');

    expect(clicked).toEqual({ href: 'blob:policy', download: 'policy.json', attached: true });
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('{"name":"x"}\n');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:policy');
    click.mockRestore();
  });
});
