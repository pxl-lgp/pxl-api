import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { UpdateApprovalDto } from '../approvals/dto/update-approval.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { CreateApprovalCommentDto } from '../approvals/dto/create-approval-comment.dto';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { approvals, assets, clients, contentItems, reports } from '../database/schema';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@Injectable()
export class ClientPortalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly approvalsService: ApprovalsService,
  ) {}

  async getOverview(user: AuthenticatedUser) {
    const client = await this.getClientForUser(user);
    const [clientContentItems, clientApprovals, clientAssets, clientReports] = await Promise.all([
      this.getContentItems(client.id),
      this.getApprovals(client.id),
      this.getAssets(client.id),
      this.getReports(client.id),
    ]);

    return {
      client,
      contentItems: clientContentItems,
      approvals: clientApprovals,
      assets: clientAssets,
      reports: clientReports,
    };
  }

  async getClientForUser(user: AuthenticatedUser) {
    if (user.role !== 'CLIENT') {
      throw new ForbiddenException('Only client users can access the client portal.');
    }

    const [linkedClient] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.userId, user.id), eq(clients.organizationId, user.organizationId)))
      .limit(1);

    if (linkedClient) {
      return linkedClient;
    }

    const matchingClients = await this.db
      .select()
      .from(clients)
      .where(
        and(eq(clients.email, user.email.toLowerCase()), eq(clients.organizationId, user.organizationId)),
      )
      .limit(2);

    if (matchingClients.length === 0) {
      throw new NotFoundException('No client workspace is linked to this user email.');
    }

    // Defensive guard for legacy data created before the unique email index:
    // refuse to silently pick one of several clients sharing this email.
    if (matchingClients.length > 1) {
      throw new ForbiddenException(
        'This email is linked to more than one client workspace. Contact your account manager.',
      );
    }

    return matchingClients[0];
  }

  async getContentForUser(user: AuthenticatedUser) {
    const client = await this.getClientForUser(user);

    return this.getContentItems(client.id);
  }

  async getApprovalsForUser(user: AuthenticatedUser) {
    const client = await this.getClientForUser(user);

    return this.getApprovals(client.id);
  }

  async getAssetsForUser(user: AuthenticatedUser) {
    const client = await this.getClientForUser(user);

    return this.getAssets(client.id);
  }

  async getReportsForUser(user: AuthenticatedUser) {
    const client = await this.getClientForUser(user);

    return this.getReports(client.id);
  }

  async decideApproval(user: AuthenticatedUser, approvalId: string, input: UpdateApprovalDto) {
    const client = await this.getClientForUser(user);

    if (input.status === 'PENDING') {
      throw new BadRequestException('Approval decisions must be APPROVED or REVISION_REQUESTED.');
    }

    const [existingApproval] = await this.db
      .select()
      .from(approvals)
      .where(and(eq(approvals.id, approvalId), eq(approvals.clientId, client.id)))
      .limit(1);

    if (!existingApproval) {
      throw new NotFoundException('Approval not found for this client.');
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
        .where(eq(approvals.id, approvalId))
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

  async getApprovalComments(user: AuthenticatedUser, approvalId: string) {
    const client = await this.getClientForUser(user);

    return this.approvalsService.findClientComments(client.id, approvalId);
  }

  async createApprovalComment(
    user: AuthenticatedUser,
    approvalId: string,
    input: CreateApprovalCommentDto,
  ) {
    const client = await this.getClientForUser(user);

    return this.approvalsService.createClientComment(client.id, approvalId, user, input);
  }

  private getContentItems(clientId: string) {
    return this.db
      .select()
      .from(contentItems)
      .where(eq(contentItems.clientId, clientId))
      .orderBy(desc(contentItems.createdAt));
  }

  private getApprovals(clientId: string) {
    return this.db
      .select()
      .from(approvals)
      .where(eq(approvals.clientId, clientId))
      .orderBy(desc(approvals.createdAt));
  }

  private getAssets(clientId: string) {
    return this.db
      .select()
      .from(assets)
      .where(eq(assets.clientId, clientId))
      .orderBy(desc(assets.createdAt));
  }

  private getReports(clientId: string) {
    return this.db
      .select()
      .from(reports)
      .where(eq(reports.clientId, clientId))
      .orderBy(desc(reports.createdAt));
  }
}
