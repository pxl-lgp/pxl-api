import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, sql } from 'drizzle-orm';
import { AutomationService } from '../automation/automation.service';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { approvals, leads } from '../database/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { shouldRemind } from './reminders';

// Fixed key for the Postgres advisory lock that serialises the reminder sweep so
// multiple API instances never send duplicate reminder emails.
const REMINDER_SWEEP_LOCK_KEY = 4815162343;

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
    // Hold a transaction-scoped advisory lock for the whole sweep so only one
    // instance reminds at a time. The lock auto-releases when the tx ends.
    await this.db.transaction(async (tx) => {
      const lockResult = await tx.execute(
        sql`select pg_try_advisory_xact_lock(${REMINDER_SWEEP_LOCK_KEY}::bigint) as locked`,
      );
      const locked = (lockResult.rows[0] as { locked?: boolean } | undefined)?.locked === true;

      if (!locked) {
        return;
      }

      const now = new Date();
      await this.remindPendingApprovals(now);
      await this.remindStaleLeads(now);
    });
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
