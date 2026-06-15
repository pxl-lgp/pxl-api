import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { analytics, contentItems } from '../database/schema';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';

type AnalyticsRecord = typeof analytics.$inferSelect;

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateAnalyticsDto): Promise<AnalyticsRecord> {
    await this.ensureContentItemExists(input.contentItemId);

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
      throw new OperationError('Failed to create analytics record.', 'analytics.create', {
        stage: 'insert-analytics',
        contentItemId: input.contentItemId,
      }, error);
    }
  }

  async findAll(): Promise<AnalyticsRecord[]> {
    return this.db.select().from(analytics).orderBy(desc(analytics.capturedAt));
  }

  async findForContent(contentItemId: string): Promise<AnalyticsRecord[]> {
    await this.ensureContentItemExists(contentItemId);

    return this.db
      .select()
      .from(analytics)
      .where(eq(analytics.contentItemId, contentItemId))
      .orderBy(desc(analytics.capturedAt));
  }

  async findOne(id: string): Promise<AnalyticsRecord> {
    const [record] = await this.db.select().from(analytics).where(eq(analytics.id, id)).limit(1);

    if (!record) {
      throw new NotFoundException('Analytics record not found.');
    }

    return record;
  }

  async update(id: string, input: UpdateAnalyticsDto): Promise<AnalyticsRecord> {
    await this.findOne(id);

    if (input.contentItemId) {
      await this.ensureContentItemExists(input.contentItemId);
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

  private async ensureContentItemExists(contentItemId: string) {
    const [contentItem] = await this.db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.id, contentItemId))
      .limit(1);

    if (!contentItem) {
      throw new NotFoundException('Content item not found.');
    }

    return contentItem;
  }
}
