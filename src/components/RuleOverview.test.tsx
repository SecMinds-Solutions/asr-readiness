import { render, screen, within } from '@testing-library/react';
import { ruleModesFromPolicies } from '../analysis/intuneRuleModes';
import { asrSettings, choice } from '../analysis/fixtures/intunePolicies';
import type { RuleOverview } from '../analysis/ruleOverview';
import { RuleOverviewView } from './RuleOverview';

const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';

function overview(overrides: Partial<RuleOverview['coverage']> = {}, policies = [
  { id: 'p1', name: 'ASR pilot', assigned: true, settings: asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit')).value },
]): RuleOverview {
  return {
    modes: ruleModesFromPolicies(policies),
    coverage: { devices: 40, auditDevices: { [ADOBE]: 12 }, devicesWithoutIntune: 0, ...overrides },
  };
}

const rowOf = (name: string) => screen.getByRole('cell', { name }).closest('tr') as HTMLElement;

describe('RuleOverviewView', () => {
  it('lists every ASR rule with its Rule mode and Coverage as n of m devices', () => {
    render(<RuleOverviewView overview={overview()} />);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 19);
    const adobe = rowOf('Block Adobe Reader from creating child processes');
    expect(within(adobe).getByText('Audit')).toBeInTheDocument();
    expect(within(adobe).getByText('12 of 40 devices')).toBeInTheDocument();
    const usb = rowOf('Block untrusted and unsigned processes that run from USB');
    expect(within(usb).getByText('Not configured')).toBeInTheDocument();
    expect(within(usb).getByText('0 of 40 devices')).toBeInTheDocument();
  });

  it('shows a conflict with the policies and their Rule modes', () => {
    render(
      <RuleOverviewView
        overview={overview({}, [
          { id: 'p1', name: 'Pilot', assigned: true, settings: asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'block')).value },
          { id: 'p2', name: 'All devices', assigned: true, settings: asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit')).value },
        ])}
      />,
    );
    const adobe = rowOf('Block Adobe Reader from creating child processes');
    expect(within(adobe).getByText('Conflict')).toBeInTheDocument();
    expect(within(adobe).getByText('Pilot: Block; All devices: Audit')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/1 ASR rule has a conflict/);
  });

  it('warns about devices without Intune management, with their number', () => {
    render(<RuleOverviewView overview={overview({ devicesWithoutIntune: 7 })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('7 of 40 devices are not managed through Intune');
  });

  it('lists the Rule modes and says Coverage is not available when it could not be read', () => {
    render(<RuleOverviewView overview={{ modes: overview().modes, coverage: null }} />);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 19);
    expect(within(rowOf('Block Adobe Reader from creating child processes')).getByText('Audit')).toBeInTheDocument();
    expect(screen.getAllByText('Not available')).toHaveLength(19);
    expect(screen.getByRole('status')).toHaveTextContent(/Coverage is not available yet/);
  });

  it('says which policy sources are not read', () => {
    render(<RuleOverviewView overview={overview()} />);
    expect(screen.getByText(/Endpoint protection profiles, security baselines or custom OMA-URI profiles are not read/)).toBeInTheDocument();
  });

  it('does not warn when every device is managed through Intune and nothing conflicts', () => {
    render(<RuleOverviewView overview={overview()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says which policies were left out and which settings it did not recognise', () => {
    render(
      <RuleOverviewView
        overview={overview({}, [
          { id: 'p1', name: 'Draft', assigned: false, settings: asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'block')).value },
          { id: 'p2', name: 'Future', assigned: true, settings: asrSettings(choice('blocksomethingnew', 'audit')).value },
        ])}
      />,
    );
    const note = screen.getByRole('status');
    expect(note).toHaveTextContent('Draft');
    expect(note).toHaveTextContent('Future');
  });
});
