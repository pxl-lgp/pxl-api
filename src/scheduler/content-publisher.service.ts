import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, desc, eq, inArray, lt, lte, sql } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { AutomationService } from '../automation/automation.service';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { approvals, contentItems } from '../database/schema';
import { ContentService } from '../content/content.service';

type DueContentItem = { id: string; title: string; clientId: string; publishAttempts: number };

// Stop retrying (and re-logging) an item after this many failed auto-publish attempts.
const MAX_PUBLISH_ATTEMPTS = 3;

// Fixed key for the Postgres advisory lock that serialises the publish sweep, so
// running multiple API instances never double-publishes the same content.
const PUBLISH_SWEEP_LOCK_KEY = 4815162342;

@Injectable()
export class ContentPublisherService {
  private readonly logger = new Logger(ContentPublisherService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly contentService: ContentService,
    private readonly automationService: AutomationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledContent(): Promise<void> {
    // Hold a transaction-scoped advisory lock for the whole sweep so only one
    // instance publishes at a time. The lock auto-releases when the transaction
    // ends; the actual publish writes happen on the pool, outside this tx.
    await this.db.transaction(async (tx) => {
      const lockResult = await tx.execute(
        sql`select pg_try_advisory_xact_lock(${PUBLISH_SWEEP_LOCK_KEY}::bigint) as locked`,
      );
      const locked = (lockResult.rows[0] as { locked?: boolean } | undefined)?.locked === true;

      if (!locked) {
        return;
      }

      await this.runPublishSweep();
    });
  }

  private async runPublishSweep(): Promise<void> {
    const due = await this.db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        clientId: contentItems.clientId,
        publishAttempts: contentItems.publishAttempts,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.status, 'SCHEDULED'),
          lte(contentItems.scheduledAt, new Date()),
          lt(contentItems.publishAttempts, MAX_PUBLISH_ATTEMPTS),
        ),
      );

    if (due.length === 0) {
      return;
    }

    // Only auto-publish content whose latest approval decision is APPROVED.
    // Scheduling overwrites content.status to SCHEDULED, so approval state must
    // be read from the approvals table rather than the content status.
    const approved = await this.filterApproved(due);

    if (approved.length === 0) {
      return;
    }

    this.logger.log(`Auto-publishing ${approved.length} scheduled content item(s).`);

    for (const item of approved) {
      try {
        await this.contentService.publish(item.id);

        void this.automationService.logEvent({
          eventName: 'content-auto-published',
          entityType: 'content',
          entityId: item.id,
          payload: { title: item.title, clientId: item.clientId },
        });
      } catch (error) {
        await this.handlePublishFailure(item, error);
      }
    }
  }

  private async handlePublishFailure(item: DueContentItem, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = item.publishAttempts + 1;
    const abandoned = attempts >= MAX_PUBLISH_ATTEMPTS;

    await this.db
      .update(contentItems)
      .set({
        publishAttempts: sql`${contentItems.publishAttempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, item.id));

    if (abandoned) {
      this.logger.error(
        `Abandoning auto-publish for content ${item.id} after ${attempts} attempt(s): ${message}`,
      );
    } else {
      this.logger.warn(
        `Auto-publish attempt ${attempts}/${MAX_PUBLISH_ATTEMPTS} failed for content ${item.id}: ${message}`,
      );
    }

    void this.automationService.logEvent({
      eventName: abandoned ? 'content-auto-publish-abandoned' : 'content-auto-publish-failed',
      entityType: 'content',
      entityId: item.id,
      status: 'FAILED',
      errorMessage: message,
      payload: {
        title: item.title,
        clientId: item.clientId,
        attempts,
        maxAttempts: MAX_PUBLISH_ATTEMPTS,
      },
    });
  }

  /**
   * Keeps only the content items whose most recent approval decision is APPROVED.
   * Items with no approval, or whose latest decision is a later revision request,
   * are held back from auto-publishing.
   */
  private async filterApproved(due: DueContentItem[]): Promise<DueContentItem[]> {
    const dueIds = due.map((item) => item.id);

    const approvalRows = await this.db
      .select({
        contentItemId: approvals.contentItemId,
        status: approvals.status,
      })
      .from(approvals)
      .where(inArray(approvals.contentItemId, dueIds))
      .orderBy(desc(approvals.createdAt));

    const latestStatus = new Map<string, string>();
    for (const row of approvalRows) {
      if (!latestStatus.has(row.contentItemId)) {
        latestStatus.set(row.contentItemId, row.status);
      }
    }

    return due.filter((item) => latestStatus.get(item.id) === 'APPROVED');
  }
}
