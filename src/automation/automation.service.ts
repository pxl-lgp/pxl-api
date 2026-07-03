import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { automationLogs, clients, contentItems, leads, reports } from '../database/schema';
import { WorkspaceService } from '../workspace/workspace.service';

type AutomationLog = typeof automationLogs.$inferSelect;
type AutomationStatus = AutomationLog['status'];

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly workspaceService: WorkspaceService,
  ) {}

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

    if (log.status === 'FAILED') {
      void this.postFailureActivity(log);
    }

    return log;
  }

  private async postFailureActivity(log: AutomationLog): Promise<void> {
    const organizationId = await this.resolveOrganizationId(log.entityType, log.entityId);
    if (!organizationId) return;

    await this.workspaceService.postActivity({
      organizationId,
      event: 'automation-failed',
      body: `Automation failed: ${log.eventName}`,
      href: '/admin/automation',
      metadata: { automationLogId: log.id, entityType: log.entityType, entityId: log.entityId },
    });
  }

  private async resolveOrganizationId(
    entityType: string,
    entityId: string | null,
  ): Promise<string | null> {
    if (!entityId) return null;

    if (entityType === 'client') {
      const [client] = await this.db
        .select({ organizationId: clients.organizationId })
        .from(clients)
        .where(eq(clients.id, entityId))
        .limit(1);
      return client?.organizationId ?? null;
    }
    if (entityType === 'lead') {
      const [lead] = await this.db
        .select({ organizationId: leads.organizationId })
        .from(leads)
        .where(eq(leads.id, entityId))
        .limit(1);
      return lead?.organizationId ?? null;
    }
    if (entityType === 'content') {
      const [content] = await this.db
        .select({ clientId: contentItems.clientId })
        .from(contentItems)
        .where(eq(contentItems.id, entityId))
        .limit(1);
      if (!content) return null;
      const [client] = await this.db
        .select({ organizationId: clients.organizationId })
        .from(clients)
        .where(eq(clients.id, content.clientId))
        .limit(1);
      return client?.organizationId ?? null;
    }
    if (entityType === 'report') {
      const [report] = await this.db
        .select({ clientId: reports.clientId })
        .from(reports)
        .where(eq(reports.id, entityId))
        .limit(1);
      if (!report) return null;
      const [client] = await this.db
        .select({ organizationId: clients.organizationId })
        .from(clients)
        .where(eq(clients.id, report.clientId))
        .limit(1);
      return client?.organizationId ?? null;
    }

    return null;
  }

  async findAll(status?: AutomationStatus, organizationId?: string): Promise<AutomationLog[]> {
    const logs = await this.db
      .select()
      .from(automationLogs)
      .where(status ? eq(automationLogs.status, status) : undefined)
      .orderBy(desc(automationLogs.createdAt));

    if (!organizationId) {
      return logs;
    }

    const scopedLogs = await Promise.all(
      logs.map(async (log) => ({
        log,
        organizationId: await this.resolveOrganizationId(log.entityType, log.entityId),
      })),
    );

    return scopedLogs
      .filter((item) => item.organizationId === organizationId)
      .map((item) => item.log);
  }

  async getSummary(organizationId?: string) {
    const logs = await this.findAll(undefined, organizationId);
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

  async findOne(id: string, organizationId?: string): Promise<AutomationLog> {
    const [log] = await this.db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.id, id))
      .limit(1);

    if (!log) {
      throw new NotFoundException('Automation log not found.');
    }

    if (organizationId) {
      const logOrganizationId = await this.resolveOrganizationId(log.entityType, log.entityId);

      if (logOrganizationId !== organizationId) {
        throw new NotFoundException('Automation log not found.');
      }
    }

    return log;
  }

  async markSucceeded(id: string, response: Record<string, unknown> = {}): Promise<void> {
    await this.db
      .update(automationLogs)
      .set({
        status: 'SUCCEEDED',
        response,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(automationLogs.id, id));
  }
}
