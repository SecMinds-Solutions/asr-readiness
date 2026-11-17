import type { RuleModes } from './intuneRuleModes';

/** How many devices each ASR rule is in Audit mode on, out of all onboarded devices. */
export interface Coverage {
  /** Devices onboarded to Defender for Endpoint that report their ASR rule states. */
  devices: number;
  /** Per ASR rule GUID: devices on which the rule is in Audit mode. */
  auditDevices: Record<string, number>;
  /** AsrConfigurationStates keys this version does not know. */
  unrecognisedRules: string[];
}

/** Every ASR rule with its Rule mode and Coverage. */
export interface RuleOverview {
  modes: RuleModes;
  /**
   * Null when no device reports its Rule modes yet; `failed` with the reason when the Coverage
   * query failed. Either way the Rule modes are shown without it.
   */
  coverage: Coverage | null | { failed: string };
}
