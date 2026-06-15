import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { approvals, contentItems } from '../database/schema';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';

type ApprovalRecord = typeof approvals.$inferSelect;

@Injectable()
export class ApprovalsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateApprovalDto): Promise<ApprovalRecord> {
    const contentItem = await this.ensureContentItemExists(input.contentItemId);

    try {
      return await this.db.transaction(async (tx) => {
        const [approval] = await tx
          .insert(approvals)
          .values({
            contentItemId: contentItem.id,
            clientId: contentItem.clientId,
            status: 'PENDING',
            revisionCount: 0,
          })
          .returning();

        await tx
          .update(contentItems)
          .set({
            status: 'CLIENT_APPROVAL',
            updatedAt: new Date(),
          })
          .where(eq(contentItems.id, contentItem.id));

        return approval;
      });
    } catch (error) {
      throw new OperationError('Failed to create approval.', 'approvals.create', {
        stage: 'insert-approval',
        contentItemId: input.contentItemId,
      }, error);
    }
  }

  async findAll(): Promise<ApprovalRecord[]> {
    return this.db.select().from(approvals).orderBy(desc(approvals.createdAt));
  }

  async findOne(id: string): Promise<ApprovalRecord> {
    const [approval] = await this.db.select().from(approvals).where(eq(approvals.id, id)).limit(1);

    if (!approval) {
      throw new NotFoundException('Approval not found.');
    }

    return approval;
  }

  async update(id: string, input: UpdateApprovalDto): Promise<ApprovalRecord> {
    const existingApproval = await this.findOne(id);

    if (input.status === 'PENDING') {
      throw new BadRequestException('Approval decisions must be APPROVED or REVISION_REQUESTED.');
    }

    const decidedAt = new Date();
    const revisionCount =
      input.status === 'REVISION_REQUESTED'
        ? existingApproval.revisionCount + 1
        : existingApproval.revisionCount;

    return this.db.transaction(async (tx) => {
      const [approval] = await tx
        .update(approvals)
        .set({
          status: input.status,
          feedback: input.feedback,
          revisionCount,
          decidedAt,
          updatedAt: decidedAt,
        })
        .where(eq(approvals.id, id))
        .returning();

      await tx
        .update(contentItems)
        .set({
          status: input.status === 'APPROVED' ? 'APPROVED' : 'REVISION_REQUESTED',
          updatedAt: new Date(),
        })
        .where(eq(contentItems.id, approval.contentItemId));

      return approval;
    });
  }

  private async ensureContentItemExists(contentItemId: string) {
    const [contentItem] = await this.db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, contentItemId))
      .limit(1);

    if (!contentItem) {
      throw new NotFoundException('Content item not found.');
    }

    return contentItem;
  }
}
