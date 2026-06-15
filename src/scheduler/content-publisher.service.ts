import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { AutomationService } from '../automation/automation.service';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { approvals, contentItems } from '../database/schema';
import { ContentService } from '../content/content.service';

type DueContentItem = { id: string; title: string; clientId: string };

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
    const due = await this.db
      .select({ id: contentItems.id, title: contentItems.title, clientId: contentItems.clientId })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.status, 'SCHEDULED'),
          lte(contentItems.scheduledAt, new Date()),
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
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to auto-publish content item ${item.id}: ${message}`);

        void this.automationService.logEvent({
          eventName: 'content-auto-published',
          entityType: 'content',
          entityId: item.id,
          status: 'FAILED',
          errorMessage: message,
          payload: { title: item.title, clientId: item.clientId },
        });
      }
    }
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
