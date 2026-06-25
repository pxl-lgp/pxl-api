import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { automationLogs } from '../database/schema';

type AutomationLog = typeof automationLogs.$inferSelect;
type AutomationStatus = AutomationLog['status'];

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

  async findAll(status?: AutomationStatus): Promise<AutomationLog[]> {
    return this.db
      .select()
      .from(automationLogs)
      .where(status ? eq(automationLogs.status, status) : undefined)
      .orderBy(desc(automationLogs.createdAt));
  }

  async getSummary() {
    const logs = await this.findAll();
    const failed = logs.filter((log) => log.status === 'FAILED');
    const pending = logs.filter((log) => log.status === 'PENDING');
    const succeeded = logs.filter((log) => log.status === 'SUCCEEDED');
    const lastFailure = failed[0];

    return {
      total: logs.length,
      failed: failed.length,
      pending: pending.length,
      succeeded: succeeded.length,
      lastFailureAt: lastFailure?.createdAt ?? null,
      retryableFailures: failed.filter((log) =>
        ['drive-folder-provisioned'].includes(log.eventName),
      ).length,
    };
  }

  async findOne(id: string): Promise<AutomationLog> {
    const [log] = await this.db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.id, id))
      .limit(1);

    if (!log) {
      throw new NotFoundException('Automation log not found.');
    }

    return log;
  }
}
