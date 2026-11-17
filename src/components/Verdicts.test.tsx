import { render, screen, within } from '@testing-library/react';
import { ASR_RULES } from '../analysis/asrRules';
import type { RuleAssessment } from '../analysis/verdicts';
import { VerdictsView } from './Verdicts';

const [first, second, third] = ASR_RULES as [(typeof ASR_RULES)[number], (typeof ASR_RULES)[number], (typeof ASR_RULES)[number]];

const assessments: RuleAssessment[] = [
  { kind: 'verdict', rule: first, verdict: 'Ready to block', reason: 'In Audit mode for at least 20 days.', paths: [], coverage: { auditDevices: 40, devices: 50 } },
  { kind: 'verdict', rule: second, verdict: 'Not ready', reason: 'Audit events come from <b>C:\\Users\\x</b>', paths: [], coverage: null },
  { kind: 'already-blocking', rule: third, reason: 'Intune already sets this rule to Block mode.', coverage: null },
];

const rowOf = (name: string) => screen.getByRole('cell', { name }).closest('tr') as HTMLElement;

describe('VerdictsView', () => {
  it('shows each rule with its Verdict as a word, its Coverage and the reason', () => {
    render(<VerdictsView assessments={assessments} />);
    const ready = rowOf(first.name);
    expect(within(ready).getByText('Ready to block')).toBeInTheDocument();
    expect(within(ready).getByText('40 of 50 devices')).toBeInTheDocument();
    expect(within(ready).getByText('In Audit mode for at least 20 days.')).toBeInTheDocument();
  });

  it('shows a rule in Block mode as Already blocking, with its reason and no Coverage', () => {
    render(<VerdictsView assessments={assessments} />);
    const blocking = rowOf(third.name);
    expect(within(blocking).getByText('Already blocking')).toBeInTheDocument();
    expect(within(blocking).getByText('Intune already sets this rule to Block mode.')).toBeInTheDocument();
    expect(within(blocking).getByText('Not applicable')).toBeInTheDocument();
  });

  it('says when Coverage is not available, and renders reasons as text', () => {
    const { container } = render(<VerdictsView assessments={assessments} />);
    const notReady = rowOf(second.name);
    expect(within(notReady).getByText('Not available')).toBeInTheDocument();
    expect(within(notReady).getByText('Audit events come from <b>C:\\Users\\x</b>')).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
  });

  it('says that a Verdict speaks only for the devices in its Coverage', () => {
    render(<VerdictsView assessments={assessments} />);
    expect(screen.getByText(/speaks only for the devices in its Coverage/)).toBeInTheDocument();
  });
});
