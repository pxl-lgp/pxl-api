import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { analytics, clients, contentItems } from '../database/schema';
import { BestTimeResult, computeBestTimes } from './best-time';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';

type AnalyticsRecord = typeof analytics.$inferSelect;

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Best-time-to-post suggestions derived from published content engagement
   * (Workflow Study §9), optionally scoped to a single client.
   */
  async getBestTimes(organizationId: string, clientId?: string): Promise<BestTimeResult> {
    const conditions = [
      isNotNull(contentItems.publishedAt),
      eq(clients.organizationId, organizationId),
    ];

    if (clientId) {
      conditions.push(eq(contentItems.clientId, clientId));
    }

    const rows = await this.db
      .select({
        publishedAt: contentItems.publishedAt,
        engagement: analytics.engagement,
      })
      .from(analytics)
      .innerJoin(contentItems, eq(analytics.contentItemId, contentItems.id))
      .innerJoin(clients, eq(contentItems.clientId, clients.id))
      .where(and(...conditions));

    return computeBestTimes(rows);
  }

  async create(input: CreateAnalyticsDto, organizationId: string): Promise<AnalyticsRecord> {
    await this.ensureContentItemExists(input.contentItemId, organizationId);

    try {
      const [record] = await this.db
        .insert(analytics)
        .values({
          contentItemId: input.contentItemId,
          reach: input.reach ?? 0,
          impressions: input.impressions ?? 0,
          engagement: input.engagement ?? 0,
          clicks: input.clicks ?? 0,
          likes: input.likes ?? 0,
          comments: input.comments ?? 0,
          shares: input.shares ?? 0,
          saves: input.saves ?? 0,
          followersGained: input.followersGained ?? 0,
          capturedAt: input.capturedAt,
        })
        .returning();

      return record;
    } catch (error) {
      throw new OperationError(
        'Failed to create analytics record.',
        'analytics.create',
        {
          stage: 'insert-analytics',
          contentItemId: input.contentItemId,
        },
        error,
      );
    }
  }

  async findAll(organizationId: string): Promise<AnalyticsRecord[]> {
    const rows = await this.db
      .select({ record: analytics })
      .from(analytics)
      .innerJoin(contentItems, eq(analytics.contentItemId, contentItems.id))
      .innerJoin(clients, eq(contentItems.clientId, clients.id))
      .where(eq(clients.organizationId, organizationId))
      .orderBy(desc(analytics.capturedAt));

    return rows.map((row) => row.record);
  }

  async findForContent(contentItemId: string, organizationId: string): Promise<AnalyticsRecord[]> {
    await this.ensureContentItemExists(contentItemId, organizationId);

    return this.db
      .select()
      .from(analytics)
      .where(eq(analytics.contentItemId, contentItemId))
      .orderBy(desc(analytics.capturedAt));
  }

  async findOne(id: string, organizationId: string): Promise<AnalyticsRecord> {
    const [row] = await this.db
      .select({ record: analytics })
      .from(analytics)
      .innerJoin(contentItems, eq(analytics.contentItemId, contentItems.id))
      .innerJoin(clients, eq(contentItems.clientId, clients.id))
      .where(and(eq(analytics.id, id), eq(clients.organizationId, organizationId)))
      .limit(1);
    const record = row?.record;

    if (!record) {
      throw new NotFoundException('Analytics record not found.');
    }

    return record;
  }

  async update(
    id: string,
    input: UpdateAnalyticsDto,
    organizationId: string,
  ): Promise<AnalyticsRecord> {
    await this.findOne(id, organizationId);

    if (input.contentItemId) {
      await this.ensureContentItemExists(input.contentItemId, organizationId);
    }

    const [record] = await this.db
      .update(analytics)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(analytics.id, id))
      .returning();

    return record;
  }

  private async ensureContentItemExists(contentItemId: string, organizationId: string) {
    const [contentItem] = await this.db
      .select({ id: contentItems.id })
      .from(contentItems)
      .innerJoin(clients, eq(contentItems.clientId, clients.id))
      .where(and(eq(contentItems.id, contentItemId), eq(clients.organizationId, organizationId)))
      .limit(1);

    if (!contentItem) {
      throw new NotFoundException('Content item not found.');
    }

    return contentItem;
  }
}
