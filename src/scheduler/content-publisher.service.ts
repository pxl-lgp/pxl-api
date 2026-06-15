import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, lte } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { AutomationService } from '../automation/automation.service';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { contentItems } from '../database/schema';
import { ContentService } from '../content/content.service';

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

    this.logger.log(`Auto-publishing ${due.length} scheduled content item(s).`);

    for (const item of due) {
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
}
