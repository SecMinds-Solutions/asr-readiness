// Advanced hunting queries. Each aggregates in KQL and takes no input, so nothing outside the code
// ends up in a query.

/**
 * How many devices are onboarded to Defender for Endpoint. Device discovery also lists devices
 * that are not onboarded, which send no audit events, so they are left out.
 */
export const HUNTING_CHECK_QUERY = 'DeviceInfo | where OnboardingStatus == "Onboarded" | summarize Devices = dcount(DeviceId)';
