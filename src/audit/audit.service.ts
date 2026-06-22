import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { auditLogs } from '../database/schema';

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async log(input: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
    });
  }

  async findAll(filter: { action?: string; entityType?: string } = {}) {
    const conditions: SQL[] = [];

    if (filter.action) {
      conditions.push(eq(auditLogs.action, filter.action));
    }

    if (filter.entityType) {
      conditions.push(eq(auditLogs.entityType, filter.entityType));
    }

    return this.db
      .select()
      .from(auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt));
  }
}
