import { Inject, Injectable, Logger } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { automationLogs } from '../database/schema';

type AutomationLog = typeof automationLogs.$inferSelect;

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async logEvent(input: {
    eventName: string;
    entityType: string;
    entityId?: string;
    payload?: Record<string, unknown>;
    status?: 'PENDING' | 'SUCCEEDED' | 'FAILED';
    response?: Record<string, unknown>;
    errorMessage?: string;
  }): Promise<AutomationLog> {
    const [log] = await this.db
      .insert(automationLogs)
      .values({
        eventName: input.eventName,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload ?? {},
        status: input.status ?? 'SUCCEEDED',
        response: input.response ?? {},
        errorMessage: input.errorMessage,
      })
      .returning();

    return log;
  }

  async updateLog(
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

  async findAll(): Promise<AutomationLog[]> {
    return this.db.select().from(automationLogs).orderBy(desc(automationLogs.createdAt));
  }
}
