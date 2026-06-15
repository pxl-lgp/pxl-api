import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';
import { AutomationService } from '../automation/automation.service';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { approvals, leads } from '../database/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { shouldRemind } from './reminders';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly automationService: AutomationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    const now = new Date();
    await this.remindPendingApprovals(now);
    await this.remindStaleLeads(now);
  }

  private async remindPendingApprovals(now: Date): Promise<void> {
    const pending = await this.db
      .select({
        id: approvals.id,
        contentItemId: approvals.contentItemId,
        clientId: approvals.clientId,
        createdAt: approvals.createdAt,
        lastReminderAt: approvals.lastReminderAt,
      })
      .from(approvals)
      .where(eq(approvals.status, 'PENDING'));

    const due = pending.filter((item) => shouldRemind(item, now));

    if (due.length === 0) {
      return;
    }

    this.logger.log(`Reminding the team about ${due.length} pending approval(s).`);

    await this.notificationsService.notifyTeam(
      `PXL: ${due.length} approval(s) waiting for review`,
      `${due.length} content approval(s) have been pending for over 24 hours. Open the approvals dashboard to follow up.`,
    );

    for (const item of due) {
      await this.db
        .update(approvals)
        .set({ lastReminderAt: now })
        .where(eq(approvals.id, item.id));

      void this.automationService.logEvent({
        eventName: 'approval-reminder',
        entityType: 'approval',
        entityId: item.id,
        payload: { contentItemId: item.contentItemId, clientId: item.clientId },
      });
    }
  }

  private async remindStaleLeads(now: Date): Promise<void> {
    const open = await this.db
      .select({
        id: leads.id,
        businessName: leads.businessName,
        email: leads.email,
        createdAt: leads.createdAt,
        lastReminderAt: leads.lastReminderAt,
      })
      .from(leads)
      .where(eq(leads.status, 'NEW'));

    const due = open.filter((item) => shouldRemind(item, now));

    if (due.length === 0) {
      return;
    }

    this.logger.log(`Reminding the team about ${due.length} un-contacted lead(s).`);

    const lines = due.map((item) => `- ${item.businessName} (${item.email})`).join('\n');
    await this.notificationsService.notifyTeam(
      `PXL: ${due.length} lead(s) need follow-up`,
      `${due.length} lead(s) have been NEW for over 24 hours:\n\n${lines}`,
    );

    for (const item of due) {
      await this.db
        .update(leads)
        .set({ lastReminderAt: now })
        .where(eq(leads.id, item.id));

      void this.automationService.logEvent({
        eventName: 'lead-follow-up-reminder',
        entityType: 'lead',
        entityId: item.id,
        payload: { businessName: item.businessName, email: item.email },
      });
    }
  }
}
