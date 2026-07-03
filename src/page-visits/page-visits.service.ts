import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { DEFAULT_ORGANIZATION_ID, pageVisits } from '../database/schema';
import { CreatePageVisitDto } from './dto/create-page-visit.dto';
import { PageVisitSummaryDto } from './dto/page-visit-summary.dto';

@Injectable()
export class PageVisitsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(
    input: CreatePageVisitDto,
    metadata: { referrer?: string; userAgent?: string },
  ): Promise<void> {
    await this.db.insert(pageVisits).values({
      path: input.path,
      organizationId: DEFAULT_ORGANIZATION_ID,
      referrer: metadata.referrer,
      userAgent: metadata.userAgent?.slice(0, 512),
    });
  }

  async getSummary(path: string, organizationId: string): Promise<PageVisitSummaryDto> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const base = and(eq(pageVisits.path, path), eq(pageVisits.organizationId, organizationId));
    const [total, today, last7Days, last30Days] = await Promise.all([
      this.countVisits(base),
      this.countVisits(and(base, gte(pageVisits.createdAt, todayStart))),
      this.countVisits(and(base, gte(pageVisits.createdAt, sevenDaysAgo))),
      this.countVisits(and(base, gte(pageVisits.createdAt, thirtyDaysAgo))),
    ]);

    return { path, total, today, last7Days, last30Days };
  }

  private async countVisits(where: ReturnType<typeof and>) {
    const [row] = await this.db.select({ total: count() }).from(pageVisits).where(where);

    return Number(row?.total ?? 0);
  }
}
