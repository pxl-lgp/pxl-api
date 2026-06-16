import { HttpException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, SQL } from 'drizzle-orm';
import { AutomationService } from '../automation/automation.service';
import { CalendarService } from '../calendar/calendar.service';
import { OperationError } from '../common/errors/operation-error';
import { normalizeSearchTerm } from '../common/query.util';
import { ContentQueryDto } from './dto/content-query.dto';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import {
  clients,
  contentItems,
  campaigns,
  socialConnections,
  SocialPublishResult,
  SocialTarget,
} from '../database/schema';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { MetaPublishingService } from './meta-publishing.service';
import { ScheduleContentDto } from './dto/schedule-content.dto';
import {
  formatLegacyPlatform,
  normalizeSocialPlatforms,
  SocialPlatform,
} from './social-platform';
import { UpdateContentItemDto } from './dto/update-content-item.dto';

type ContentItemRecord = typeof contentItems.$inferSelect;

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly automationService: AutomationService,
    private readonly metaPublishingService: MetaPublishingService,
    private readonly calendarService: CalendarService,
  ) {}

  async create(input: CreateContentItemDto): Promise<ContentItemRecord> {
    await this.ensureClientExists(input.clientId);
    await this.ensureCampaignBelongsToClient(input.campaignId, input.clientId);
    const socialTargets = this.normalizeSocialTargets(input.socialTargets);
    await this.ensureTargetsBelongToClient(input.clientId, socialTargets);
    const platforms = socialTargets.length
      ? this.getTargetPlatforms(socialTargets)
      : normalizeSocialPlatforms(input.platforms, input.platform);

    try {
      const [contentItem] = await this.db
        .insert(contentItems)
        .values({
          clientId: input.clientId,
          campaignId: input.campaignId,
          title: input.title,
          contentType: input.contentType,
          platform: input.platform ?? formatLegacyPlatform(platforms),
          platforms,
          socialTargets,
          status: input.status ?? 'IDEA',
          caption: input.caption,
          hashtags: input.hashtags ?? [],
          mediaUrl: input.mediaUrl,
          scheduledAt: input.scheduledAt,
          publishedAt: input.publishedAt,
        })
        .returning();

      return contentItem;
    } catch (error) {
      throw new OperationError('Failed to create content item.', 'content.create', {
        stage: 'insert-content-item',
        clientId: input.clientId,
        title: input.title,
      }, error);
    }
  }

  async findAll(filter: ContentQueryDto = {}): Promise<ContentItemRecord[]> {
    const conditions: SQL[] = [];

    if (filter.clientId) {
      conditions.push(eq(contentItems.clientId, filter.clientId));
    }

    if (filter.campaignId) {
      conditions.push(eq(contentItems.campaignId, filter.campaignId));
    }

    if (filter.status) {
      conditions.push(eq(contentItems.status, filter.status));
    }

    if (filter.contentType) {
      conditions.push(eq(contentItems.contentType, filter.contentType));
    }

    const search = normalizeSearchTerm(filter.q);
    if (search) {
      conditions.push(ilike(contentItems.title, search));
    }

    return this.db
      .select()
      .from(contentItems)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(contentItems.createdAt));
  }

  async findOne(id: string): Promise<ContentItemRecord> {
    const [contentItem] = await this.db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, id))
      .limit(1);

    if (!contentItem) {
      throw new NotFoundException('Content item not found.');
    }

    return contentItem;
  }

  async update(id: string, input: UpdateContentItemDto): Promise<ContentItemRecord> {
    const existingContentItem = await this.findOne(id);
    const clientId = input.clientId ?? existingContentItem.clientId;

    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
    }

    await this.ensureCampaignBelongsToClient(input.campaignId, clientId);

    const socialTargets =
      input.socialTargets !== undefined
        ? this.normalizeSocialTargets(input.socialTargets)
        : existingContentItem.socialTargets;
    await this.ensureTargetsBelongToClient(clientId, socialTargets);
    const platforms = socialTargets.length
      ? this.getTargetPlatforms(socialTargets)
      : input.platforms || input.platform !== undefined
        ? normalizeSocialPlatforms(input.platforms, input.platform)
        : existingContentItem.platforms;

    const [contentItem] = await this.db
      .update(contentItems)
      .set({
        ...input,
        platform:
          input.platform ??
          (input.platforms || input.socialTargets
            ? formatLegacyPlatform(platforms)
            : existingContentItem.platform),
        platforms,
        socialTargets,
        publishResults:
          input.platforms || input.socialTargets || input.mediaUrl !== undefined
            ? {}
            : existingContentItem.publishResults,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, id))
      .returning();

    return contentItem;
  }

  async schedule(id: string, input: ScheduleContentDto): Promise<ContentItemRecord> {
    const existingContentItem = await this.findOne(id);

    try {
      const [contentItem] = await this.db
        .update(contentItems)
        .set({
          scheduledAt: input.scheduledAt,
          status: 'SCHEDULED',
          updatedAt: new Date(),
        })
        .where(eq(contentItems.id, id))
        .returning();

      void this.automationService
        .logEvent({
          eventName: 'content-scheduled',
          entityType: 'content',
          entityId: contentItem.id,
          payload: {
            id: contentItem.id,
            clientId: contentItem.clientId,
            title: contentItem.title,
            contentType: contentItem.contentType,
            platform: contentItem.platform,
            platforms: contentItem.platforms,
            socialTargets: contentItem.socialTargets,
            caption: contentItem.caption,
            hashtags: contentItem.hashtags,
            mediaUrl: contentItem.mediaUrl,
            scheduledAt: contentItem.scheduledAt,
            previousStatus: existingContentItem.status,
          },
        })
        .catch((error: unknown) => {
          this.logger.error(
            `Failed to log content-scheduled event for ${contentItem.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

      // Create a Google Calendar publishing reminder in the background, replacing
      // the old n8n content-scheduled flow. Skipped silently when no calendar is
      // configured; never blocks or fails the schedule request.
      this.createScheduleReminder(contentItem);

      return contentItem;
    } catch (error) {
      throw new OperationError('Failed to schedule content item.', 'content.schedule', {
        stage: 'schedule-content-item',
        contentItemId: id,
      }, error);
    }
  }

  /**
   * Re-runs calendar-reminder creation for a content item. Backs the automation
   * retry endpoint so a FAILED content-calendar-reminder log can be re-attempted.
   */
  async retryCalendarReminder(id: string): Promise<void> {
    const contentItem = await this.findOne(id);
    this.createScheduleReminder(contentItem);
  }

  private createScheduleReminder(contentItem: ContentItemRecord): void {
    if (!this.calendarService.isEnabled()) {
      return;
    }

    void this.calendarService
      .createPublishReminder({
        contentId: contentItem.id,
        clientId: contentItem.clientId,
        title: contentItem.title,
        platform: contentItem.platform,
        contentType: contentItem.contentType,
        caption: contentItem.caption,
        hashtags: contentItem.hashtags,
        scheduledAt: contentItem.scheduledAt,
      })
      .then((result) => {
        void this.automationService.logEvent({
          eventName: 'content-calendar-reminder',
          entityType: 'content',
          entityId: contentItem.id,
          payload: { eventId: result.eventId, htmlLink: result.htmlLink },
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to create calendar reminder for content ${contentItem.id}: ${message}`,
        );

        void this.automationService.logEvent({
          eventName: 'content-calendar-reminder',
          entityType: 'content',
          entityId: contentItem.id,
          status: 'FAILED',
          errorMessage: message,
        });
      });
  }

  async publish(id: string): Promise<ContentItemRecord> {
    let contentItem = await this.findOne(id);
    const socialTargets = this.normalizeSocialTargets(contentItem.socialTargets);
    const platforms = this.getTargetPlatforms(socialTargets);
    let publishResults = contentItem.publishResults ?? {};

    if (socialTargets.length === 0) {
      throw new HttpException(
        'Select at least one connected Facebook Page or Instagram account before publishing.',
        400,
      );
    }

    const connections = await this.getTargetConnections(contentItem.clientId, socialTargets);

    for (const target of socialTargets) {
      const resultKey = this.getPublishResultKey(target);

      if (publishResults[resultKey]?.status === 'SUCCEEDED') {
        continue;
      }

      const connection = connections.get(target.connectionId);

      if (!connection) {
        throw new HttpException('A selected social connection is no longer available.', 400);
      }

      const destinationName =
        target.platform === 'FACEBOOK_PAGE'
          ? connection.facebookPageName
          : `@${connection.instagramUsername ?? connection.instagramAccountId}`;

      try {
        const result = await this.metaPublishingService.publish({
          platform: target.platform,
          contentType: contentItem.contentType,
          caption: contentItem.caption,
          hashtags: contentItem.hashtags,
          mediaUrl: contentItem.mediaUrl,
          connection,
        });

        publishResults = {
          ...publishResults,
          [resultKey]: {
            status: 'SUCCEEDED',
            connectionId: target.connectionId,
            platform: target.platform,
            destinationName,
            remoteId: result.remoteId,
            publishedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        publishResults = {
          ...publishResults,
          [resultKey]: {
            status: 'FAILED',
            connectionId: target.connectionId,
            platform: target.platform,
            destinationName,
            error: this.getErrorMessage(error),
          },
        };

        await this.savePublishResults(id, platforms, socialTargets, publishResults);
        throw error;
      }

      contentItem = await this.savePublishResults(
        id,
        platforms,
        socialTargets,
        publishResults,
      );
    }

    [contentItem] = await this.db
      .update(contentItems)
      .set({
        platform: formatLegacyPlatform(platforms),
        platforms,
        socialTargets,
        publishResults,
        publishedAt: new Date(),
        status: 'PUBLISHED',
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, id))
      .returning();

    return contentItem;
  }

  private async savePublishResults(
    id: string,
    platforms: SocialPlatform[],
    socialTargets: SocialTarget[],
    publishResults: Record<string, SocialPublishResult>,
  ): Promise<ContentItemRecord> {
    const [contentItem] = await this.db
      .update(contentItems)
      .set({
        platform: formatLegacyPlatform(platforms),
        platforms,
        socialTargets,
        publishResults,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, id))
      .returning();

    return contentItem;
  }

  private normalizeSocialTargets(
    targets: Array<{ connectionId: string; platform: SocialPlatform }> | undefined,
  ): SocialTarget[] {
    const unique = new Map<string, SocialTarget>();

    for (const target of targets ?? []) {
      unique.set(this.getPublishResultKey(target), target);
    }

    return [...unique.values()];
  }

  private getTargetPlatforms(targets: SocialTarget[]): SocialPlatform[] {
    return [...new Set(targets.map((target) => target.platform))];
  }

  private getPublishResultKey(target: SocialTarget) {
    return `${target.connectionId}:${target.platform}`;
  }

  private async ensureTargetsBelongToClient(clientId: string, targets: SocialTarget[]) {
    if (targets.length === 0) {
      return;
    }

    await this.getTargetConnections(clientId, targets);
  }

  private async getTargetConnections(clientId: string, targets: SocialTarget[]) {
    const connectionIds = [...new Set(targets.map((target) => target.connectionId))];
    const records = await this.db
      .select()
      .from(socialConnections)
      .where(
        and(
          eq(socialConnections.clientId, clientId),
          eq(socialConnections.status, 'CONNECTED'),
          inArray(socialConnections.id, connectionIds),
        ),
      );

    if (records.length !== connectionIds.length) {
      throw new HttpException(
        'Every selected social destination must be an active connection for this client.',
        400,
      );
    }

    const byId = new Map(records.map((connection) => [connection.id, connection]));

    for (const target of targets) {
      const connection = byId.get(target.connectionId);

      if (
        target.platform === 'INSTAGRAM' &&
        connection &&
        !connection.instagramAccountId
      ) {
        throw new HttpException(
          `${connection.facebookPageName} does not have a connected Instagram professional account.`,
          400,
        );
      }

      if (connection?.tokenExpiresAt && connection.tokenExpiresAt <= new Date()) {
        throw new HttpException(
          `${connection.facebookPageName} has an expired Meta connection. Reconnect its owner.`,
          400,
        );
      }
    }

    return byId;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response && 'message' in response) {
        const message = response.message;

        return Array.isArray(message) ? message.join(', ') : String(message);
      }
    }

    return error instanceof Error ? error.message : 'Unknown publishing error.';
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const [client] = await this.db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }
  }

  private async ensureCampaignBelongsToClient(campaignId: string | undefined, clientId: string): Promise<void> {
    if (!campaignId) {
      return;
    }

    const [campaign] = await this.db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.clientId, clientId)))
      .limit(1);

    if (!campaign) {
      throw new NotFoundException('Campaign not found for this client.');
    }
  }
}
