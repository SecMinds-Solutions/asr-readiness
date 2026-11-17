// The thresholds an Analysis uses, each defined only here (see CONTEXT.md). User-writable locations
// are defined in userWritable.ts.

/** The Observation window: the days of Audit events an Analysis looks at. */
export const OBSERVATION_WINDOW_DAYS = 30;

/** The Minimum audit period: the days a rule must have been in Audit mode before no events means anything. */
export const MINIMUM_AUDIT_PERIOD_DAYS = 14;

/** A rule is Ready with exclusions only when all its Audit events come from at most this many paths. */
export const MAX_SUGGESTED_EXCLUSIONS = 5;
