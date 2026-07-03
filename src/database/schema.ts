import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['SUPER_ADMIN', 'ADMIN', 'TEAM', 'CLIENT']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'DISABLED']);
export const authTokenPurposeEnum = pgEnum('auth_token_purpose', ['INVITE', 'PASSWORD_RESET']);
export const clientStatusEnum = pgEnum('client_status', [
  'LEAD',
  'ONBOARDING',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
]);
export const leadStatusEnum = pgEnum('lead_status', [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'WON',
  'LOST',
]);
export const contentStatusEnum = pgEnum('content_status', [
  'IDEA',
  'DRAFTING',
  'DESIGNING',
  'INTERNAL_REVIEW',
  'CLIENT_APPROVAL',
  'APPROVED',
  'REVISION_REQUESTED',
  'SCHEDULED',
  'PUBLISHED',
  'REPORTED',
]);
export const approvalStatusEnum = pgEnum('approval_status', [
  'PENDING',
  'APPROVED',
  'REVISION_REQUESTED',
]);
export const automationStatusEnum = pgEnum('automation_status', [
  'PENDING',
  'SENT',
  'SUCCEEDED',
  'FAILED',
]);
export const socialConnectionStatusEnum = pgEnum('social_connection_status', [
  'CONNECTED',
  'EXPIRED',
  'REVOKED',
]);
export const leadScoreBandEnum = pgEnum('lead_score_band', ['COLD', 'WARM', 'HOT']);
export const onboardingTaskStatusEnum = pgEnum('onboarding_task_status', [
  'PENDING',
  'IN_PROGRESS',
  'DONE',
]);
export const campaignStatusEnum = pgEnum('campaign_status', [
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
]);
export const workspaceChannelTypeEnum = pgEnum('workspace_channel_type', [
  'GENERAL',
  'CLIENT',
  'PROJECT',
  'SYSTEM',
]);
export const workspaceVisibilityEnum = pgEnum('workspace_visibility', ['PUBLIC', 'PRIVATE']);
export const workspaceMemberRoleEnum = pgEnum('workspace_member_role', ['OWNER', 'MEMBER']);
export const workspaceTaskPriorityEnum = pgEnum('workspace_task_priority', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

export type SocialPlatform = 'FACEBOOK_PAGE' | 'INSTAGRAM';

export type SocialTarget = {
  connectionId: string;
  platform: SocialPlatform;
};

export type SocialPublishResult = {
  status: 'SUCCEEDED' | 'FAILED';
  connectionId?: string;
  platform?: SocialPlatform;
  destinationName?: string;
  remoteId?: string;
  publishedAt?: string;
  error?: string;
};

export const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ...timestamps,
});

export const organizationFeatureAccess = pgTable(
  'organization_feature_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    featureKey: text('feature_key').notNull(),
    enabled: integer('enabled').default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('organization_feature_access_unique').on(table.organizationId, table.featureKey),
  ],
);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').default('TEAM').notNull(),
  status: userStatusEnum('status').default('ACTIVE').notNull(),
  ...timestamps,
});

export const authTokens = pgTable('auth_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  purpose: authTokenPurposeEnum('purpose').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
});

export const notificationSettings = pgTable('notification_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventKey: text('event_key').notNull().unique(),
  enabled: integer('enabled').default(1).notNull(),
  recipients: jsonb('recipients').$type<string[]>().default([]).notNull(),
  ...timestamps,
});

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    businessName: text('business_name').notNull(),
    industry: text('industry'),
    contactPerson: text('contact_person'),
    email: text('email'),
    phone: text('phone'),
    socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}).notNull(),
    goals: text('goals'),
    brandNotes: text('brand_notes'),
    servicesNeeded: jsonb('services_needed').$type<string[]>().default([]).notNull(),
    status: clientStatusEnum('status').default('ONBOARDING').notNull(),
    driveFolderUrl: text('drive_folder_url'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('clients_organization_email_unique').on(table.organizationId, table.email),
    uniqueIndex('clients_user_id_unique').on(table.userId),
    index('clients_organization_idx').on(table.organizationId),
  ],
);

export const metaAuthorizations = pgTable(
  'meta_authorizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    metaUserId: text('meta_user_id').notNull(),
    metaUserName: text('meta_user_name'),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopes: jsonb('scopes').$type<string[]>().default([]).notNull(),
    status: socialConnectionStatusEnum('status').default('CONNECTED').notNull(),
    connectedByUserId: uuid('connected_by_user_id').references(() => users.id),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('meta_authorizations_client_user_unique').on(table.clientId, table.metaUserId),
  ],
);

export const socialConnections = pgTable(
  'social_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    authorizationId: uuid('authorization_id')
      .references(() => metaAuthorizations.id, { onDelete: 'cascade' })
      .notNull(),
    facebookPageId: text('facebook_page_id').notNull(),
    facebookPageName: text('facebook_page_name').notNull(),
    instagramAccountId: text('instagram_account_id'),
    instagramUsername: text('instagram_username'),
    pageAccessTokenEncrypted: text('page_access_token_encrypted').notNull(),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    status: socialConnectionStatusEnum('status').default('CONNECTED').notNull(),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('social_connections_client_page_unique').on(table.clientId, table.facebookPageId),
  ],
);

export const metaOauthStates = pgTable('meta_oauth_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  nonceHash: text('nonce_hash').notNull().unique(),
  clientId: uuid('client_id')
    .references(() => clients.id, { onDelete: 'cascade' })
    .notNull(),
  createdByUserId: uuid('created_by_user_id')
    .references(() => users.id)
    .notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
});

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  businessName: text('business_name').notNull(),
  contactPerson: text('contact_person'),
  email: text('email').notNull(),
  phone: text('phone'),
  source: text('source'),
  message: text('message'),
  status: leadStatusEnum('status').default('NEW').notNull(),
  // Heuristic lead-qualification score (0-100) and band, computed on intake so the
  // team can triage hot leads first. See leads/lead-scoring.ts.
  score: integer('score').default(0).notNull(),
  scoreBand: leadScoreBandEnum('score_band').default('COLD').notNull(),
  scoreReasons: jsonb('score_reasons').$type<string[]>().default([]).notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
  ...timestamps,
});

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    status: campaignStatusEnum('status').default('PLANNED').notNull(),
    goal: text('goal'),
    budget: text('budget'),
    audience: text('audience'),
    offer: text('offer'),
    notes: text('notes'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('campaigns_client_idx').on(table.clientId)],
);

export const contentItems = pgTable(
  'content_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .references(() => clients.id)
      .notNull(),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    contentType: text('content_type').notNull(),
    platform: text('platform'),
    platforms: jsonb('platforms').$type<SocialPlatform[]>().default([]).notNull(),
    socialTargets: jsonb('social_targets').$type<SocialTarget[]>().default([]).notNull(),
    status: contentStatusEnum('status').default('IDEA').notNull(),
    caption: text('caption'),
    hashtags: jsonb('hashtags').$type<string[]>().default([]).notNull(),
    mediaUrl: text('media_url'),
    publishResults: jsonb('publish_results')
      .$type<Record<string, SocialPublishResult>>()
      .default({})
      .notNull(),
    // Number of failed auto-publish attempts. Used to stop the every-minute cron
    // from retrying (and re-logging) a permanently failing item forever.
    publishAttempts: integer('publish_attempts').default(0).notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    // Supports the scheduler's every-minute "due SCHEDULED content" scan.
    index('content_items_status_scheduled_at_idx').on(table.status, table.scheduledAt),
    index('content_items_campaign_idx').on(table.campaignId),
  ],
);

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentItemId: uuid('content_item_id')
    .references(() => contentItems.id)
    .notNull(),
  clientId: uuid('client_id')
    .references(() => clients.id)
    .notNull(),
  status: approvalStatusEnum('status').default('PENDING').notNull(),
  feedback: text('feedback'),
  revisionCount: integer('revision_count').default(0).notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
  ...timestamps,
});

export const approvalComments = pgTable(
  'approval_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    approvalId: uuid('approval_id')
      .references(() => approvals.id, { onDelete: 'cascade' })
      .notNull(),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    authorRole: userRoleEnum('author_role').notNull(),
    body: text('body').notNull(),
    ...timestamps,
  },
  (table) => [index('approval_comments_approval_idx').on(table.approvalId)],
);

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id')
    .references(() => clients.id)
    .notNull(),
  contentItemId: uuid('content_item_id').references(() => contentItems.id),
  name: text('name').notNull(),
  assetType: text('asset_type').notNull(),
  driveUrl: text('drive_url').notNull(),
  version: integer('version').default(1).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  ...timestamps,
});

export const analytics = pgTable('analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentItemId: uuid('content_item_id')
    .references(() => contentItems.id)
    .notNull(),
  reach: integer('reach').default(0).notNull(),
  impressions: integer('impressions').default(0).notNull(),
  engagement: integer('engagement').default(0).notNull(),
  clicks: integer('clicks').default(0).notNull(),
  likes: integer('likes').default(0).notNull(),
  comments: integer('comments').default(0).notNull(),
  shares: integer('shares').default(0).notNull(),
  saves: integer('saves').default(0).notNull(),
  followersGained: integer('followers_gained').default(0).notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id')
    .references(() => clients.id)
    .notNull(),
  title: text('title').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  summary: text('summary'),
  driveUrl: text('drive_url'),
  status: text('status').default('DRAFT').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  ...timestamps,
});

// Standard onboarding checklist generated for every new client (Workflow Study
// §3: "task creation"). Lets the team track onboarding to completion.
export const onboardingTasks = pgTable(
  'onboarding_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: onboardingTaskStatusEnum('status').default('PENDING').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('onboarding_tasks_client_idx').on(table.clientId)],
);

// Content pillars define the recurring themes a client's monthly plan is built
// from (Workflow Study §4: "content pillars, monthly plans").
export const contentPillars = pgTable(
  'content_pillars',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // Target number of posts per month for this pillar; drives monthly planning.
    cadencePerMonth: integer('cadence_per_month').default(0).notNull(),
    ...timestamps,
  },
  (table) => [index('content_pillars_client_idx').on(table.clientId)],
);

// Reusable content templates (Workflow Study §5: "template-based generation").
// A NULL clientId means a shared, agency-wide template available to every client.
export const contentTemplates = pgTable('content_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  contentType: text('content_type').notNull(),
  platform: text('platform'),
  // The reusable skeleton: hook/sections/CTA outline the team or AI fills in.
  body: text('body').notNull(),
  ...timestamps,
});

export const workspaceChannels = pgTable(
  'workspace_channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    type: workspaceChannelTypeEnum('type').default('GENERAL').notNull(),
    visibility: workspaceVisibilityEnum('visibility').default('PUBLIC').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('workspace_channels_organization_slug_unique').on(table.organizationId, table.slug),
    index('workspace_channels_organization_idx').on(table.organizationId),
    index('workspace_channels_client_idx').on(table.clientId),
  ],
);

export const workspaceChannelMembers = pgTable(
  'workspace_channel_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    channelId: uuid('channel_id')
      .references(() => workspaceChannels.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: workspaceMemberRoleEnum('role').default('MEMBER').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('workspace_channel_members_channel_user_unique').on(table.channelId, table.userId),
    index('workspace_channel_members_channel_idx').on(table.channelId),
  ],
);

export const workspaceMessages = pgTable(
  'workspace_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    channelId: uuid('channel_id')
      .references(() => workspaceChannels.id, { onDelete: 'cascade' })
      .notNull(),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (table) => [
    index('workspace_messages_channel_idx').on(table.channelId),
    index('workspace_messages_organization_idx').on(table.organizationId),
  ],
);

export const workspaceBoards = pgTable(
  'workspace_boards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    workflowStatuses: jsonb('workflow_statuses').$type<string[]>().default([]).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('workspace_boards_organization_slug_unique').on(table.organizationId, table.slug),
    index('workspace_boards_organization_idx').on(table.organizationId),
  ],
);

export const workspaceTasks = pgTable(
  'workspace_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    boardId: uuid('board_id').references(() => workspaceBoards.id, { onDelete: 'set null' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    contentItemId: uuid('content_item_id').references(() => contentItems.id, {
      onDelete: 'set null',
    }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').default('TODO').notNull(),
    priority: workspaceTaskPriorityEnum('priority').default('MEDIUM').notNull(),
    assigneeUserId: uuid('assignee_user_id').references(() => users.id, { onDelete: 'set null' }),
    reporterUserId: uuid('reporter_user_id').references(() => users.id, { onDelete: 'set null' }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    position: integer('position').default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index('workspace_tasks_organization_idx').on(table.organizationId),
    index('workspace_tasks_board_idx').on(table.boardId),
    index('workspace_tasks_assignee_idx').on(table.assigneeUserId),
  ],
);

export const workspaceTaskComments = pgTable(
  'workspace_task_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    taskId: uuid('task_id')
      .references(() => workspaceTasks.id, { onDelete: 'cascade' })
      .notNull(),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    ...timestamps,
  },
  (table) => [index('workspace_task_comments_task_idx').on(table.taskId)],
);

export const workspacePages = pgTable(
  'workspace_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    parentPageId: uuid('parent_page_id'),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    icon: text('icon'),
    content: jsonb('content')
      .$type<{ format: 'markdown'; text: string }>()
      .default({ format: 'markdown', text: '' })
      .notNull(),
    visibility: workspaceVisibilityEnum('visibility').default('PUBLIC').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('workspace_pages_organization_slug_unique').on(table.organizationId, table.slug),
    index('workspace_pages_organization_idx').on(table.organizationId),
  ],
);

export const automationLogs = pgTable('automation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventName: text('event_name').notNull(),
  status: automationStatusEnum('status').default('PENDING').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
  response: jsonb('response').$type<Record<string, unknown>>().default({}).notNull(),
  errorMessage: text('error_message'),
  ...timestamps,
});
