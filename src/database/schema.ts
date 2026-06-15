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

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'TEAM', 'CLIENT']);
export const clientStatusEnum = pgEnum('client_status', ['LEAD', 'ONBOARDING', 'ACTIVE', 'PAUSED', 'ARCHIVED']);
export const leadStatusEnum = pgEnum('lead_status', ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST']);
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
export const approvalStatusEnum = pgEnum('approval_status', ['PENDING', 'APPROVED', 'REVISION_REQUESTED']);
export const automationStatusEnum = pgEnum('automation_status', ['PENDING', 'SENT', 'SUCCEEDED', 'FAILED']);
export const socialConnectionStatusEnum = pgEnum('social_connection_status', [
  'CONNECTED',
  'EXPIRED',
  'REVOKED',
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

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').default('TEAM').notNull(),
  ...timestamps,
});

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
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
  // Client-portal users are linked to their workspace by email, so the email
  // must resolve to at most one client. (Postgres allows multiple NULL emails.)
  (table) => [uniqueIndex('clients_email_unique').on(table.email)],
);

export const metaAuthorizations = pgTable(
  'meta_authorizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
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
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
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
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
});

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessName: text('business_name').notNull(),
  contactPerson: text('contact_person'),
  email: text('email').notNull(),
  phone: text('phone'),
  source: text('source'),
  message: text('message'),
  status: leadStatusEnum('status').default('NEW').notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
  ...timestamps,
});

export const contentItems = pgTable(
  'content_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id').references(() => clients.id).notNull(),
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
  ],
);

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentItemId: uuid('content_item_id').references(() => contentItems.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  status: approvalStatusEnum('status').default('PENDING').notNull(),
  feedback: text('feedback'),
  revisionCount: integer('revision_count').default(0).notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
  ...timestamps,
});

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
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
  contentItemId: uuid('content_item_id').references(() => contentItems.id).notNull(),
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
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  title: text('title').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  summary: text('summary'),
  driveUrl: text('drive_url'),
  ...timestamps,
});

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
