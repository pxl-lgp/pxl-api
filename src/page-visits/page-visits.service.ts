import { Inject, Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { pageVisits } from '../database/schema';
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
      referrer: metadata.referrer,
      userAgent: metadata.userAgent,
    });
  }

  async getSummary(path: string): Promise<PageVisitSummaryDto> {
    const [row] = await this.db
      .select({ total: count() })
      .from(pageVisits)
      .where(eq(pageVisits.path, path));

    return { path, total: Number(row?.total ?? 0) };
  }
}
