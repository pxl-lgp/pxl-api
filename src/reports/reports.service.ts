import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { desc, eq } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { clients, reports } from '../database/schema';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

type ReportRecord = typeof reports.$inferSelect;

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(input: CreateReportDto): Promise<ReportRecord> {
    await this.ensureClientExists(input.clientId);

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
      throw new OperationError('Failed to create report.', 'reports.create', {
        stage: 'insert-report',
        clientId: input.clientId,
        title: input.title,
      }, error);
    }
  }

  async findAll(): Promise<ReportRecord[]> {
    return this.db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async findOne(id: string): Promise<ReportRecord> {
    const [report] = await this.db.select().from(reports).where(eq(reports.id, id)).limit(1);

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return report;
  }

  async update(id: string, input: UpdateReportDto): Promise<ReportRecord> {
    await this.findOne(id);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
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

  async markReady(id: string): Promise<ReportRecord> {
    return this.update(id, { status: 'READY' });
  }

  async send(id: string): Promise<ReportRecord> {
    const report = await this.findOne(id);
    const [client] = await this.db.select().from(clients).where(eq(clients.id, report.clientId)).limit(1);
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

    return updated;
  }

  private async ensureClientExists(clientId: string) {
    const [client] = await this.db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }
}
