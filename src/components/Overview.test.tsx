import { render, screen, within } from '@testing-library/react';
import { ASR_RULES } from '../analysis/asrRules';
import type { RuleAssessment } from '../analysis/verdicts';
import { OverviewView } from './Overview';

const [a, b, c] = ASR_RULES as [(typeof ASR_RULES)[0], (typeof ASR_RULES)[0], (typeof ASR_RULES)[0]];
const assessment = (rule: typeof a, verdict: 'Ready to block' | 'Not ready' | 'No evidence', auditDevices: number): RuleAssessment => ({
  kind: 'verdict',
  rule,
  verdict,
  reason: '',
  paths: [],
  coverage: { auditDevices, devices: 50 },
});

const tile = (name: RegExp) => screen.getByRole('link', { name });

describe('OverviewView', () => {
  it('shows the devices and the number of rules per Verdict with their Coverage, each opening the Verdicts filtered to it', () => {
    render(<OverviewView devices={50} assessments={[assessment(a, 'Ready to block', 48), assessment(b, 'Ready to block', 50), assessment(c, 'No evidence', 0)]} />);
    expect(tile(/Devices report their Rule modes/)).toHaveTextContent('50');
    expect(tile(/Devices report their Rule modes/)).toHaveAttribute('href', 'https://app.asrcompass.cloud/rules');
    const ready = tile(/^2 Ready to block/);
    expect(ready).toHaveTextContent('Coverage 48–50 of 50 devices');
    expect(ready).toHaveAttribute('href', 'https://app.asrcompass.cloud/verdicts?verdict=ready-to-block');
    expect(tile(/^1 No evidence/)).toHaveTextContent('Coverage 0 of 50 devices');
    expect(tile(/^0 Not ready/)).toHaveAttribute('href', 'https://app.asrcompass.cloud/verdicts?verdict=not-ready');
    expect(tile(/^0 Already blocking/)).toHaveTextContent('No rules');
  });

  it('points to the Suggested policy when a rule is ready', () => {
    render(<OverviewView devices={50} assessments={[assessment(a, 'Ready to block', 48)]} />);
    const next = screen.getByRole('heading', { name: 'Next step' }).closest('article') as HTMLElement;
    expect(next).toHaveTextContent('1 ASR rule is ready to move to Block mode');
    expect(within(next).getByRole('link', { name: 'Open the Suggested policy' })).toHaveAttribute('href', 'https://app.asrcompass.cloud/policy');
  });

  it('does not point to the Suggested policy when no rule is ready, and says what ready means', () => {
    render(<OverviewView devices={50} assessments={[assessment(a, 'Not ready', 48), assessment(b, 'No evidence', 0)]} />);
    const next = screen.getByRole('heading', { name: 'Next step' }).closest('article') as HTMLElement;
    expect(next).toHaveTextContent('No ASR rule is ready to move to Block mode yet');
    expect(next).toHaveTextContent('Minimum audit period of 14 days');
    expect(within(next).queryByRole('link', { name: /Suggested policy/ })).toBeNull();
    expect(within(next).getByRole('link', { name: 'See why in the Verdicts' })).toHaveAttribute('href', 'https://app.asrcompass.cloud/verdicts');
  });
});
