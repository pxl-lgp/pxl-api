import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { automationLogs } from '../database/schema';

export type AutomationLog = typeof automationLogs.$inferSelect;

/** Builds the in-process event name a listener subscribes to for an automation. */
export const automationEventName = (eventName: string) => `automation.${eventName}`;

@Injectable()
export class AutomationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly eventEmitter: EventEmitter2,
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

    // Dispatch to in-process listeners. Listeners do their work in the
    // background and report completion via recordResult, so a slow Google API
    // call never blocks the user-facing request that emitted the event.
    this.eventEmitter.emit(automationEventName(log.eventName), log);

    return log;
  }

  async findAll(): Promise<AutomationLog[]> {
    return this.db.select().from(automationLogs).orderBy(desc(automationLogs.createdAt));
  }

  /** Records the outcome of an automation handler against its log row. */
  async recordResult(
    id: string,
    input: {
      status: 'SUCCEEDED' | 'FAILED';
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
}
