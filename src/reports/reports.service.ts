import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { and, desc, eq } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { clients, reports } from '../database/schema';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

type ReportRecord = typeof reports.$inferSelect;

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly notificationsService: NotificationsService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async create(input: CreateReportDto, organizationId: string): Promise<ReportRecord> {
    await this.ensureClientExists(input.clientId, organizationId);

    try {
      const [report] = await this.db
        .insert(reports)
        .values({
          clientId: input.clientId,
          title: input.title,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          summary: input.summary,
          driveUrl: input.driveUrl,
          status: input.status ?? 'DRAFT',
        })
        .returning();

      return report;
    } catch (error) {
      throw new OperationError(
        'Failed to create report.',
        'reports.create',
        {
          stage: 'insert-report',
          clientId: input.clientId,
          title: input.title,
        },
        error,
      );
    }
  }

  async findAll(organizationId: string): Promise<ReportRecord[]> {
    const rows = await this.db
      .select({ report: reports })
      .from(reports)
      .innerJoin(clients, eq(reports.clientId, clients.id))
      .where(eq(clients.organizationId, organizationId))
      .orderBy(desc(reports.createdAt));

    return rows.map((row) => row.report);
  }

  async findOne(id: string, organizationId: string): Promise<ReportRecord> {
    const [row] = await this.db
      .select({ report: reports })
      .from(reports)
      .innerJoin(clients, eq(reports.clientId, clients.id))
      .where(and(eq(reports.id, id), eq(clients.organizationId, organizationId)))
      .limit(1);
    const report = row?.report;

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return report;
  }

  async update(id: string, input: UpdateReportDto, organizationId: string): Promise<ReportRecord> {
    await this.findOne(id, organizationId);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId, organizationId);
    }

    const [report] = await this.db
      .update(reports)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, id))
      .returning();

    return report;
  }

  async markReady(id: string, organizationId: string): Promise<ReportRecord> {
    return this.update(id, { status: 'READY' }, organizationId);
  }

  async send(id: string, organizationId: string): Promise<ReportRecord> {
    const report = await this.findOne(id, organizationId);
    const [client] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, report.clientId), eq(clients.organizationId, organizationId)))
      .limit(1);
    const [updated] = await this.db
      .update(reports)
      .set({ status: 'SENT', sentAt: new Date(), updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();

    if (client?.email) {
      await this.notificationsService.notifyUser(
        client.email,
        `New report: ${report.title}`,
        `Your latest PXL report is ready.${report.driveUrl ? `\n\nOpen it here: ${report.driveUrl}` : ''}`,
      );
    }

    if (client) {
      void this.workspaceService.postActivity({
        organizationId: client.organizationId,
        event: 'report-sent',
        body: `Report sent: ${report.title}`,
        href: '/admin/reports',
        metadata: { reportId: report.id, clientId: report.clientId },
      });
    }

    return updated;
  }

  private async ensureClientExists(clientId: string, organizationId: string) {
    const [client] = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }
}
