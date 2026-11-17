# Coverage comes from the Rule mode each device reports to advanced hunting

Coverage is the share of a Tenant's devices on which an ASR rule is in Audit mode. The app takes it from advanced hunting: the latest `DeviceTvmInfoGathering` record of each device that reported in the last 7 days has `AdditionalFields.AsrConfigurationStates`, with one key per ASR rule and the Rule mode the device actually runs, such as Off, Audit or Block. One query counts, in KQL, the devices per rule and Rule mode; no per-device data reaches the browser. Coverage is the devices with the rule in Audit mode, out of the devices that report their Rule modes.

This is the Rule mode on the device, whatever set it: Intune, Group Policy, Configuration Manager or a local setting. The Rule mode column, in contrast, shows what the Tenant's Intune policies configure. The two can differ, and that difference is worth seeing.

## Considered Options

- **Intune policy assignments**: a policy's groups do not say which devices are in them without reading group membership, which needs a directory permission beyond ADR-0002. Rejected.
- **Intune device status reports** (`reports/exportJobs`): asynchronous exports per policy, limited to Intune-managed devices, and their permission is not documented for the app's read scope. Rejected.

## Consequences

- Microsoft does not document `AsrConfigurationStates` or its keys. The keys in the ASR rule catalogue are taken from a real Tenant's answer, and the app lists any key it does not recognise instead of dropping it. If Microsoft changes the field, Coverage changes with it.
- Advanced hunting does not show which devices Intune manages. Coverage therefore includes every reporting device, whatever manages it, and devices without Intune management cannot be identified or shown separately. The app says so next to Coverage.
- A device that has not reported its Rule modes in the last 7 days, such as an offboarded one, is not in Coverage.
