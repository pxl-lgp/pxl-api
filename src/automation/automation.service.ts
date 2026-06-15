import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { desc, eq } from 'drizzle-orm';
import { AppConfig } from '../config/app.config';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { automationLogs } from '../database/schema';

type AutomationLog = typeof automationLogs.$inferSelect;

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async emitEvent(input: {
    eventName: string;
    entityType: string;
    entityId?: string;
    payload?: Record<string, unknown>;
  }): Promise<AutomationLog> {
    const [log] = await this.db
      .insert(automationLogs)
      .values({
        eventName: input.eventName,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload ?? {},
        status: 'PENDING',
      })
      .returning();

    return this.deliverEvent(log);
  }

  async findAll(): Promise<AutomationLog[]> {
    return this.db.select().from(automationLogs).orderBy(desc(automationLogs.createdAt));
  }

  private async deliverEvent(log: AutomationLog): Promise<AutomationLog> {
    const webhookUrl = this.getWebhookUrl(log.eventName);

    if (!webhookUrl) {
      return log;
    }

    const secret = this.config.get('AUTOMATION_WEBHOOK_SECRET', { infer: true });

    try {
      await this.updateLog(log.id, {
        status: 'SENT',
        response: {
          webhookUrl,
          sentAt: new Date().toISOString(),
        },
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-pxl-automation-secret': secret } : {}),
        },
        body: JSON.stringify({
          eventName: log.eventName,
          entityType: log.entityType,
          entityId: log.entityId,
          payload: log.payload,
          automationLogId: log.id,
        }),
      });
      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(`n8n webhook responded ${response.status}: ${responseBody}`);
      }

      return this.updateLog(log.id, {
        status: 'SUCCEEDED',
        response: {
          webhookUrl,
          status: response.status,
          body: responseBody,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown automation delivery error.';
      this.logger.error(`Automation delivery failed for ${log.eventName}: ${message}`);

      return this.updateLog(log.id, {
        status: 'FAILED',
        errorMessage: message,
        response: {
          webhookUrl,
          failedAt: new Date().toISOString(),
        },
      });
    }
  }

  private async updateLog(
    id: string,
    input: {
      status: 'PENDING' | 'SENT' | 'SUCCEEDED' | 'FAILED';
      response?: Record<string, unknown>;
      errorMessage?: string;
    },
  ): Promise<AutomationLog> {
    const [log] = await this.db
      .update(automationLogs)
      .set({
        status: input.status,
        response: input.response ?? {},
        errorMessage: input.errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(automationLogs.id, id))
      .returning();

    return log;
  }

  private getWebhookUrl(eventName: string): string | undefined {
    if (eventName === 'client-created') {
      const clientCreatedUrl = this.config.get('N8N_CLIENT_CREATED_WEBHOOK_URL', { infer: true });

      if (clientCreatedUrl) {
        return clientCreatedUrl;
      }
    }

    if (eventName === 'content-scheduled') {
      const contentScheduledUrl = this.config.get('N8N_CONTENT_SCHEDULED_WEBHOOK_URL', { infer: true });

      if (contentScheduledUrl) {
        return contentScheduledUrl;
      }
    }

    if (eventName === 'lead-created') {
      const leadCreatedUrl = this.config.get('N8N_LEAD_CREATED_WEBHOOK_URL', { infer: true });

      if (leadCreatedUrl) {
        return leadCreatedUrl;
      }
    }

    const webhookBaseUrl = this.config.get('N8N_WEBHOOK_BASE_URL', { infer: true });

    if (!webhookBaseUrl) {
      return undefined;
    }

    return `${webhookBaseUrl.replace(/\/$/, '')}/${eventName}`;
  }
}
