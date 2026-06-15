import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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

  private async ensureClientExists(clientId: string) {
    const [client] = await this.db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }
}
