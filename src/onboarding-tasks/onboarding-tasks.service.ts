import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { clients, onboardingTasks } from '../database/schema';
import { DEFAULT_ONBOARDING_TASKS } from './default-tasks';
import { UpdateOnboardingTaskDto } from './dto/update-onboarding-task.dto';

type OnboardingTaskRecord = typeof onboardingTasks.$inferSelect;

@Injectable()
export class OnboardingTasksService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Seeds the standard onboarding checklist for a client. Idempotent: does nothing
   * if the client already has tasks, so re-running client-created automation (e.g.
   * lead conversion) never duplicates the checklist.
   */
  async seedForClient(clientId: string): Promise<void> {
    const existing = await this.db
      .select({ id: onboardingTasks.id })
      .from(onboardingTasks)
      .where(eq(onboardingTasks.clientId, clientId))
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    await this.db.insert(onboardingTasks).values(
      DEFAULT_ONBOARDING_TASKS.map((task, index) => ({
        clientId,
        title: task.title,
        description: task.description,
        sortOrder: index,
      })),
    );
  }

  async findForClient(clientId: string): Promise<OnboardingTaskRecord[]> {
    return this.db
      .select()
      .from(onboardingTasks)
      .where(eq(onboardingTasks.clientId, clientId))
      .orderBy(asc(onboardingTasks.sortOrder));
  }

  async update(id: string, input: UpdateOnboardingTaskDto): Promise<OnboardingTaskRecord> {
    const [existing] = await this.db
      .select()
      .from(onboardingTasks)
      .where(eq(onboardingTasks.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Onboarding task not found.');
    }

    const completedAt =
      input.status === 'DONE'
        ? (existing.completedAt ?? new Date())
        : input.status
          ? null
          : existing.completedAt;

    const [task] = await this.db
      .update(onboardingTasks)
      .set({
        ...input,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(onboardingTasks.id, id))
      .returning();

    return task;
  }

  async ensureClientExists(clientId: string): Promise<void> {
    const [client] = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }
  }
}
