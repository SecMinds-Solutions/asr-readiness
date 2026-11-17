// Realistic Microsoft Graph beta answers for Intune settings catalog policies, in the shape of
// GET /deviceManagement/configurationPolicies/{id}/settings (see Microsoft's Graph reference and
// the Microsoft365DSC tests for the Attack Surface Reduction Rules profile).

const PREFIX = 'device_vendor_msft_policy_config_defender_attacksurfacereductionrules';

export const choice = (rule: string, mode: 'off' | 'block' | 'audit' | 'warn', exclusions: string[] = []) => ({
  '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance',
  settingDefinitionId: `${PREFIX}_${rule}`,
  settingInstanceTemplateReference: null,
  choiceSettingValue: {
    settingValueTemplateReference: null,
    value: `${PREFIX}_${rule}_${mode}`,
    children: exclusions.length
      ? [
          {
            '@odata.type': '#microsoft.graph.deviceManagementConfigurationSimpleSettingCollectionInstance',
            settingDefinitionId: `${PREFIX}_${rule}_perruleexclusions`,
            settingInstanceTemplateReference: null,
            simpleSettingCollectionValue: exclusions.map((value) => ({
              '@odata.type': '#microsoft.graph.deviceManagementConfigurationStringSettingValue',
              settingValueTemplateReference: null,
              value,
            })),
          },
        ]
      : [],
  },
});

/** One settings page of an ASR rules policy with the given rule settings. */
export const asrSettings = (...children: unknown[]) => ({
  '@odata.context': "https://graph.microsoft.com/beta/$metadata#deviceManagement/configurationPolicies('id')/settings",
  value: [
    {
      id: '0',
      settingInstance: {
        '@odata.type': '#microsoft.graph.deviceManagementConfigurationGroupSettingCollectionInstance',
        settingDefinitionId: PREFIX,
        settingInstanceTemplateReference: { settingInstanceTemplateId: '19600663-e264-4c02-8f55-f2983216d6d7' },
        groupSettingCollectionValue: [{ settingValueTemplateReference: null, children }],
      },
    },
  ],
});

/** A settings page of a policy without ASR rules (here: a Defender Antivirus setting). */
export const otherSettings = {
  value: [
    {
      id: '0',
      settingInstance: {
        '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance',
        settingDefinitionId: 'device_vendor_msft_policy_config_defender_allowrealtimemonitoring',
        choiceSettingValue: { value: 'device_vendor_msft_policy_config_defender_allowrealtimemonitoring_1', children: [] },
      },
    },
  ],
};

// Assignment targets as GET /deviceManagement/configurationPolicies/{id}/assignments returns them
// (Graph beta deviceManagementConfigurationPolicyAssignment).
const assignment = (target: Record<string, unknown>) => ({
  id: `a-${String(target['groupId'] ?? target['@odata.type'])}`,
  source: 'direct',
  sourceId: null,
  target: {
    deviceAndAppManagementAssignmentFilterId: null,
    deviceAndAppManagementAssignmentFilterType: 'none',
    ...target,
  },
});

export const toGroup = (groupId: string) => assignment({ '@odata.type': '#microsoft.graph.groupAssignmentTarget', groupId });
export const excludingGroup = (groupId: string) =>
  assignment({ '@odata.type': '#microsoft.graph.exclusionGroupAssignmentTarget', groupId });
export const toAllDevices = assignment({ '@odata.type': '#microsoft.graph.allDevicesAssignmentTarget' });
export const toAllUsers = assignment({ '@odata.type': '#microsoft.graph.allLicensedUsersAssignmentTarget' });

export const groupAssignment = { value: [toGroup('g1')] };
