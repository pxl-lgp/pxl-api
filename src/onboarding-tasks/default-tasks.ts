export type DefaultOnboardingTask = {
  title: string;
  description: string;
};

// The standard checklist seeded for every new client (Workflow Study §3).
export const DEFAULT_ONBOARDING_TASKS: DefaultOnboardingTask[] = [
  {
    title: 'Collect brand assets & guidelines',
    description: 'Logo, fonts, colors, brand voice, and any existing creative.',
  },
  {
    title: 'Set up Google Drive workspace',
    description: 'Confirm the auto-provisioned client folder and subfolders.',
  },
  {
    title: 'Connect social media accounts',
    description: "Link the client's Facebook Page(s) and Instagram via Meta OAuth.",
  },
  {
    title: 'Define content pillars & monthly plan',
    description: 'Agree on recurring themes and posting cadence.',
  },
  {
    title: 'Schedule kickoff call',
    description: 'Align on goals, expectations, and timelines.',
  },
  {
    title: 'Share client portal access',
    description: 'Create the client login so they can review and approve content.',
  },
  {
    title: 'Approve first content batch',
    description: 'Produce and get sign-off on the first set of posts.',
  },
];
