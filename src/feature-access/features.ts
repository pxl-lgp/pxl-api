export const featureDefinitions = [
  {
    key: 'clients',
    label: 'Clients',
    description: 'Client records and onboarding workspace management.',
  },
  { key: 'leads', label: 'Leads', description: 'Lead inbox, qualification, and conversion.' },
  {
    key: 'content',
    label: 'Content',
    description: 'Content planning, scheduling, and publishing.',
  },
  {
    key: 'campaigns',
    label: 'Campaigns',
    description: 'Campaign planning and campaign-linked content.',
  },
  {
    key: 'approvals',
    label: 'Approvals',
    description: 'Client approval workflow and revision requests.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Performance metrics and best-time insights.',
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Client performance report creation and delivery.',
  },
  { key: 'assets', label: 'Assets', description: 'Asset library and AI-assisted tagging.' },
  { key: 'automation', label: 'Automation', description: 'Automation logs and retry operations.' },
  {
    key: 'operations',
    label: 'Operations',
    description: 'Import/export, search, health, and observability tools.',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Notification, permissions, and account administration.',
  },
  {
    key: 'workspace',
    label: 'Workspace',
    description: 'Channels, tasks, docs, and team collaboration.',
  },
] as const;

export type FeatureKey = (typeof featureDefinitions)[number]['key'];

export function isFeatureKey(value: string): value is FeatureKey {
  return featureDefinitions.some((feature) => feature.key === value);
}
