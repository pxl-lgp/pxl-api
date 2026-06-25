import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { approvalComments, approvals, contentItems } from '../database/schema';
import { CreateApprovalCommentDto } from './dto/create-approval-comment.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';

type ApprovalRecord = typeof approvals.$inferSelect;
type ApprovalCommentRecord = typeof approvalComments.$inferSelect;

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
      throw new OperationError(
        'Failed to create approval.',
        'approvals.create',
        {
          stage: 'insert-approval',
          contentItemId: input.contentItemId,
        },
        error,
      );
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

  async findComments(approvalId: string): Promise<ApprovalCommentRecord[]> {
    await this.findOne(approvalId);

    return this.db
      .select()
      .from(approvalComments)
      .where(eq(approvalComments.approvalId, approvalId))
      .orderBy(asc(approvalComments.createdAt));
  }

  async createComment(
    approvalId: string,
    user: AuthenticatedUser,
    input: CreateApprovalCommentDto,
  ): Promise<ApprovalCommentRecord> {
    const approval = await this.findOne(approvalId);
    const [comment] = await this.db
      .insert(approvalComments)
      .values({
        approvalId,
        clientId: approval.clientId,
        authorUserId: user.id,
        authorName: user.name,
        authorRole: user.role,
        body: input.body.trim(),
      })
      .returning();

    return comment;
  }

  async findClientComments(clientId: string, approvalId: string): Promise<ApprovalCommentRecord[]> {
    await this.ensureApprovalForClient(approvalId, clientId);

    return this.db
      .select()
      .from(approvalComments)
      .where(
        and(eq(approvalComments.approvalId, approvalId), eq(approvalComments.clientId, clientId)),
      )
      .orderBy(asc(approvalComments.createdAt));
  }

  async createClientComment(
    clientId: string,
    approvalId: string,
    user: AuthenticatedUser,
    input: CreateApprovalCommentDto,
  ): Promise<ApprovalCommentRecord> {
    await this.ensureApprovalForClient(approvalId, clientId);
    const [comment] = await this.db
      .insert(approvalComments)
      .values({
        approvalId,
        clientId,
        authorUserId: user.id,
        authorName: user.name,
        authorRole: user.role,
        body: input.body.trim(),
      })
      .returning();

    return comment;
  }

  private async ensureApprovalForClient(
    approvalId: string,
    clientId: string,
  ): Promise<ApprovalRecord> {
    const [approval] = await this.db
      .select()
      .from(approvals)
      .where(and(eq(approvals.id, approvalId), eq(approvals.clientId, clientId)))
      .limit(1);

    if (!approval) {
      throw new NotFoundException('Approval not found for this client.');
    }

    return approval;
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
