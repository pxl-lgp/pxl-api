import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { notificationSettings } from '../database/schema';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';

const defaultNotificationSettings = [
  { eventKey: 'new-lead', enabled: true, recipients: [] },
  { eventKey: 'client-onboarding', enabled: true, recipients: [] },
  { eventKey: 'approval-requested', enabled: true, recipients: [] },
  { eventKey: 'revision-requested', enabled: true, recipients: [] },
  { eventKey: 'automation-failed', enabled: true, recipients: [] },
  { eventKey: 'report-ready', enabled: true, recipients: [] },
];

@Injectable()
export class SettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findNotificationSettings() {
    await this.seedDefaults();
    const records = await this.db.select().from(notificationSettings);

    return records.map((record) => ({
      eventKey: record.eventKey,
      enabled: record.enabled === 1,
      recipients: record.recipients,
    }));
  }

  async updateNotificationSetting(eventKey: string, input: UpdateNotificationSettingDto) {
    await this.seedDefaults();
    const [record] = await this.db
      .update(notificationSettings)
      .set({
        enabled: input.enabled == null ? undefined : input.enabled ? 1 : 0,
        recipients: input.recipients,
        updatedAt: new Date(),
      })
      .where(eq(notificationSettings.eventKey, eventKey))
      .returning();

    return {
      eventKey: record.eventKey,
      enabled: record.enabled === 1,
      recipients: record.recipients,
    };
  }

  async getRecipients(eventKey: string, fallback?: string): Promise<string[]> {
    await this.seedDefaults();
    const [record] = await this.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.eventKey, eventKey))
      .limit(1);

    if (!record || record.enabled !== 1) {
      return [];
    }

    return record.recipients.length ? record.recipients : fallback ? [fallback] : [];
  }

  private async seedDefaults() {
    for (const setting of defaultNotificationSettings) {
      await this.db
        .insert(notificationSettings)
        .values({
          eventKey: setting.eventKey,
          enabled: setting.enabled ? 1 : 0,
          recipients: setting.recipients,
        })
        .onConflictDoNothing();
    }
  }
}
