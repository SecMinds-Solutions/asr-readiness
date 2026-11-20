// Microsoft Graph v1.0 answers of GET /deviceManagement/auditEvents, in the shape a real Tenant
// returned them, with made-up IDs, names and actors.

const actor = {
  auditActorType: 'ItPro',
  userPermissions: ['*'],
  applicationId: '00000000-0000-0000-0000-000000000001',
  applicationDisplayName: 'Microsoft Intune portal extension',
  userPrincipalName: 'admin@contoso.example',
  servicePrincipalName: null,
  ipAddress: null,
  userId: '00000000-0000-0000-0000-000000000002',
};

const event = (activityType: string, activityDateTime: string, resources: unknown[]) => ({
  id: `event-${activityDateTime}`,
  displayName: activityType,
  componentName: 'DeviceConfiguration',
  activity: null,
  activityDateTime,
  activityType,
  activityOperationType: activityType.split(' ')[0],
  activityResult: 'Success',
  correlationId: '00000000-0000-0000-0000-000000000003',
  category: 'DeviceConfiguration',
  actor,
  resources,
});

const policyResource = (policyId: string, modifiedProperties: unknown[] = []) => ({
  displayName: 'ASR rules',
  auditResourceType: 'DeviceManagementConfigurationPolicy',
  resourceId: policyId,
  modifiedProperties,
});

/** A change to a settings catalog policy itself; Intune does not say which settings changed. */
export const policyPatched = (policyId: string, at: string) =>
  event('Patch DeviceManagementConfigurationPolicy', at, [
    policyResource(policyId, [
      { displayName: 'Name', oldValue: null, newValue: 'ASR rules' },
      { displayName: 'SettingCount', oldValue: null, newValue: '1' },
    ]),
  ]);

/** An assignment of a settings catalog policy that was created or deleted. */
export const assignmentChanged = (operation: 'Create' | 'Delete', policyId: string, at: string, { withPolicy = true } = {}) =>
  event(`${operation} DeviceManagementConfigurationPolicyAssignment`, at, [
    ...(withPolicy ? [policyResource(policyId)] : []),
    {
      displayName: '<null>',
      auditResourceType: 'DeviceManagementConfigurationPolicyAssignment',
      resourceId: `${policyId}_acacacac-9df4-4c7d-9d50-4ef0226f57a9`,
      modifiedProperties: [{ displayName: 'Target.Type', oldValue: null, newValue: 'AllLicensedUsersAssignmentTarget' }],
    },
  ]);

/** An event about something other than a settings catalog policy. */
export const scriptPatched = (at: string) =>
  event('patchDeviceHealthScript DeviceHealthScript', at, [
    { displayName: null, auditResourceType: 'Microsoft.Management.Services.Api.DeviceHealthScript', resourceId: 'script-1', modifiedProperties: [] },
  ]);
