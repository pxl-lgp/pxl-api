import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { AutomationService } from '../automation/automation.service';
import { AppConfig } from '../config/app.config';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { DriveService } from '../drive/drive.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OnboardingTasksService } from '../onboarding-tasks/onboarding-tasks.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { authTokens, clients, DEFAULT_ORGANIZATION_ID, users } from '../database/schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

type ClientRecord = typeof clients.$inferSelect;
type ClientWithPortalUser = ClientRecord & {
  portalUserEmail: string | null;
  portalUserStatus: 'ACTIVE' | 'DISABLED' | null;
};
const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly auditService: AuditService,
    private readonly automationService: AutomationService,
    private readonly notificationsService: NotificationsService,
    private readonly onboardingTasksService: OnboardingTasksService,
    private readonly workspaceService: WorkspaceService,
    @Inject(forwardRef(() => DriveService))
    @Optional()
    private readonly driveService: DriveService | null,
  ) {}

  async create(
    input: CreateClientDto,
    organizationId = DEFAULT_ORGANIZATION_ID,
  ): Promise<ClientWithPortalUser> {
    if (input.createPortalUser) {
      if (!input.email) {
        throw new BadRequestException('Email is required to create a client portal user.');
      }

      if (!input.portalPassword) {
        throw new BadRequestException('Password is required to create a client portal user.');
      }

      return this.createWithPortalUser(input, organizationId, input.portalPassword);
    }

    let client: ClientRecord;

    try {
      [client] = await this.db
        .insert(clients)
        .values({
          organizationId,
          userId: undefined,
          businessName: input.businessName,
          industry: input.industry,
          contactPerson: input.contactPerson,
          email: input.email?.toLowerCase(),
          phone: input.phone,
          socialLinks: input.socialLinks ?? {},
          goals: input.goals,
          brandNotes: input.brandNotes,
          servicesNeeded: input.servicesNeeded ?? [],
          status: input.status ?? 'ONBOARDING',
          driveFolderUrl: input.driveFolderUrl,
        })
        .returning();
    } catch (error) {
      throw new OperationError(
        'Failed to create client record.',
        'clients.create',
        {
          stage: 'insert-client',
          businessName: input.businessName,
        },
        error,
      );
    }

    this.runClientCreatedAutomation(client);
    void this.workspaceService.postActivity({
      organizationId: client.organizationId,
      event: 'client-created',
      body: `Client created: ${client.businessName}`,
      href: `/admin/clients/${client.id}`,
      metadata: { clientId: client.id },
    });

    return this.findOne(client.id, organizationId);
  }

  async createWithPortalUser(
    input: Omit<CreateClientDto, 'createPortalUser' | 'portalPassword'>,
    organizationId = DEFAULT_ORGANIZATION_ID,
    password: string,
  ): Promise<ClientWithPortalUser> {
    const email = input.email?.trim().toLowerCase();

    if (!email) {
      throw new BadRequestException('Email is required to create a client portal user.');
    }

    const passwordHash = await hash(password, PASSWORD_SALT_ROUNDS);
    let client: ClientRecord;

    try {
      client = await this.db.transaction(async (tx) => {
        const [existingClient] = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(and(eq(clients.organizationId, organizationId), eq(clients.email, email)))
          .limit(1);

        if (existingClient) {
          throw new ConflictException('A client profile with this email already exists.');
        }

        const [existingUser] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser) {
          throw new ConflictException('A user with this email already exists.');
        }

        const [user] = await tx
          .insert(users)
          .values({
            organizationId,
            email,
            passwordHash,
            name: input.contactPerson?.trim() || input.businessName,
            role: 'CLIENT',
            status: 'ACTIVE',
          })
          .returning();

        const [createdClient] = await tx
          .insert(clients)
          .values({
            organizationId,
            userId: user.id,
            businessName: input.businessName,
            industry: input.industry,
            contactPerson: input.contactPerson,
            email,
            phone: input.phone,
            socialLinks: input.socialLinks ?? {},
            goals: input.goals,
            brandNotes: input.brandNotes,
            servicesNeeded: input.servicesNeeded ?? [],
            status: input.status ?? 'ONBOARDING',
            driveFolderUrl: input.driveFolderUrl,
          })
          .returning();

        return createdClient;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new OperationError(
        'Failed to create linked client portal account.',
        'clients.createWithPortalUser',
        {
          stage: 'insert-client-user',
          businessName: input.businessName,
          email,
        },
        error,
      );
    }

    this.runClientCreatedAutomation(client, { userId: client.userId });
    void this.auditService.log({
      action: 'client.portal_user_created',
      entityType: 'client',
      entityId: client.id,
      metadata: { email, userId: client.userId },
    });
    void this.workspaceService.postActivity({
      organizationId: client.organizationId,
      event: 'client-created',
      body: `Client created: ${client.businessName}`,
      href: `/admin/clients/${client.id}`,
      metadata: { clientId: client.id, userId: client.userId },
    });

    return this.findOne(client.id, organizationId);
  }

  async createWithPortalInvite(
    input: Omit<CreateClientDto, 'createPortalUser' | 'portalPassword'>,
    organizationId = DEFAULT_ORGANIZATION_ID,
  ): Promise<ClientWithPortalUser> {
    const client = await this.createWithPortalUser(
      input,
      organizationId,
      randomBytes(32).toString('hex'),
    );

    if (!client.userId || !client.email) {
      return client;
    }

    const link = await this.createAuthLink(client.userId, 'INVITE');
    await this.notificationsService.notifyUser(
      client.email,
      'Set up your PXL client portal',
      `Thanks for completing onboarding. Set your PXL client portal password here:\n\n${link}\n\nThis link expires in 7 days.`,
    );
    await this.auditService.log({
      action: 'client.self_onboarding_invite_sent',
      entityType: 'client',
      entityId: client.id,
      metadata: { email: client.email, userId: client.userId },
    });

    return client;
  }

  async createPortalUser(
    id: string,
    organizationId: string,
    actorUserId: string,
  ): Promise<ClientWithPortalUser> {
    const client = await this.findOne(id, organizationId);

    if (client.userId) {
      throw new ConflictException('This client already has a linked portal user.');
    }

    if (!client.email) {
      throw new BadRequestException('Client email is required to create a portal user.');
    }

    const email = client.email.toLowerCase();
    const passwordHash = await hash(randomBytes(32).toString('hex'), PASSWORD_SALT_ROUNDS);
    const user = await this.db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        if (existingUser.organizationId !== organizationId || existingUser.role !== 'CLIENT') {
          throw new ConflictException('A non-client user with this email already exists.');
        }

        const [linkedClient] = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.userId, existingUser.id))
          .limit(1);

        if (linkedClient && linkedClient.id !== client.id) {
          throw new ConflictException('This user is already linked to another client profile.');
        }

        await tx
          .update(clients)
          .set({ userId: existingUser.id, updatedAt: new Date() })
          .where(eq(clients.id, client.id));

        return existingUser;
      }

      const [createdUser] = await tx
        .insert(users)
        .values({
          organizationId,
          email,
          passwordHash,
          name: client.contactPerson?.trim() || client.businessName,
          role: 'CLIENT',
          status: 'ACTIVE',
        })
        .returning();

      await tx
        .update(clients)
        .set({ userId: createdUser.id, updatedAt: new Date() })
        .where(eq(clients.id, client.id));

      return createdUser;
    });

    const link = await this.createAuthLink(user.id, 'INVITE');
    await this.notificationsService.notifyUser(
      user.email,
      'Your PXL client portal invite',
      `Your PXL client portal is ready. Set your password here:\n\n${link}\n\nThis link expires in 7 days.`,
    );
    await this.auditService.log({
      actorUserId,
      action: 'client.portal_user_invited',
      entityType: 'client',
      entityId: client.id,
      metadata: { email: user.email, userId: user.id },
    });

    return this.findOne(id, organizationId);
  }

  async sendPortalUserPasswordReset(
    id: string,
    organizationId: string,
    actorUserId: string,
  ): Promise<void> {
    const client = await this.findOne(id, organizationId);

    if (!client.userId) {
      throw new NotFoundException('This client does not have a linked portal user.');
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, client.userId), eq(users.organizationId, organizationId)))
      .limit(1);

    if (!user) {
      throw new NotFoundException('Linked portal user not found.');
    }

    const link = await this.createAuthLink(user.id, 'PASSWORD_RESET');
    await this.notificationsService.notifyUser(
      user.email,
      'Reset your PXL client portal password',
      `Reset your PXL client portal password here:\n\n${link}\n\nThis link expires in 1 hour.`,
    );
    await this.auditService.log({
      actorUserId,
      action: 'client.portal_user_password_reset_sent',
      entityType: 'client',
      entityId: client.id,
      metadata: { email: user.email, userId: user.id },
    });
  }

  async disablePortalUser(
    id: string,
    organizationId: string,
    actorUserId: string,
  ): Promise<ClientWithPortalUser> {
    const client = await this.findOne(id, organizationId);

    if (!client.userId) {
      throw new NotFoundException('This client does not have a linked portal user.');
    }

    await this.db
      .update(users)
      .set({ status: 'DISABLED', updatedAt: new Date() })
      .where(and(eq(users.id, client.userId), eq(users.organizationId, organizationId)));
    await this.auditService.log({
      actorUserId,
      action: 'client.portal_user_disabled',
      entityType: 'client',
      entityId: client.id,
      metadata: { email: client.portalUserEmail, userId: client.userId },
    });

    return this.findOne(id, organizationId);
  }

  async unlinkPortalUser(
    id: string,
    organizationId: string,
    actorUserId: string,
  ): Promise<ClientWithPortalUser> {
    const client = await this.findOne(id, organizationId);

    if (!client.userId) {
      return client;
    }

    await this.db
      .update(clients)
      .set({ userId: null, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)));
    await this.auditService.log({
      actorUserId,
      action: 'client.portal_user_unlinked',
      entityType: 'client',
      entityId: client.id,
      metadata: { email: client.portalUserEmail, userId: client.userId },
    });

    return this.findOne(id, organizationId);
  }

  /**
   * Fires the side-effects every newly created client should get: Drive folder
   * provisioning, a team onboarding notification, and a client-created log event.
   * All run in the background so they never block or fail the caller. Shared by
   * direct client creation and lead-to-client conversion so both paths behave the
   * same way.
   */
  runClientCreatedAutomation(
    client: ClientRecord,
    extraPayload: Record<string, unknown> = {},
  ): void {
    // Auto-provision a Google Drive folder if Drive is configured and no folder was supplied.
    if (!client.driveFolderUrl) {
      void this.provisionDriveFolder(client);
    }

    // Seed the standard onboarding checklist (Workflow Study §3) in the background.
    void this.onboardingTasksService.seedForClient(client.id).catch((error: unknown) => {
      this.logger.error(
        `Failed to seed onboarding tasks for client ${client.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    // Notify the team of the new client/onboarding in the background.
    void this.notificationsService.notifyTeamOfNewOnboarding({
      businessName: client.businessName,
      contactPerson: client.contactPerson,
      email: client.email,
    });

    void this.automationService
      .logEvent({
        eventName: 'client-created',
        entityType: 'client',
        entityId: client.id,
        payload: {
          clientId: client.id,
          businessName: client.businessName,
          industry: client.industry,
          contactPerson: client.contactPerson,
          email: client.email,
          servicesNeeded: client.servicesNeeded,
          status: client.status,
          ...extraPayload,
        },
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to log client-created event: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  async findAll(organizationId: string): Promise<ClientWithPortalUser[]> {
    const records = await this.db
      .select({ client: clients, portalUserEmail: users.email, portalUserStatus: users.status })
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id))
      .where(eq(clients.organizationId, organizationId))
      .orderBy(desc(clients.createdAt));

    return records.map((record) => ({
      ...record.client,
      portalUserEmail: record.portalUserEmail,
      portalUserStatus: record.portalUserStatus,
    }));
  }

  async findOne(id: string, organizationId?: string): Promise<ClientWithPortalUser> {
    const [record] = await this.db
      .select({ client: clients, portalUserEmail: users.email, portalUserStatus: users.status })
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id))
      .where(
        organizationId
          ? and(eq(clients.id, id), eq(clients.organizationId, organizationId))
          : eq(clients.id, id),
      )
      .limit(1);

    if (!record) {
      throw new NotFoundException('Client not found.');
    }

    return {
      ...record.client,
      portalUserEmail: record.portalUserEmail,
      portalUserStatus: record.portalUserStatus,
    };
  }

  async update(id: string, input: UpdateClientDto, organizationId: string): Promise<ClientWithPortalUser> {
    const existingClient = await this.findOne(id, organizationId);

    if (input.email && existingClient.userId && input.email.toLowerCase() !== existingClient.email) {
      throw new BadRequestException('Unlink or update the portal user before changing this client email.');
    }

    await this.db
      .update(clients)
      .set({
        ...input,
        email: input.email?.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
      .returning();

    return this.findOne(id, organizationId);
  }

  private async createAuthLink(
    userId: string,
    purpose: 'INVITE' | 'PASSWORD_RESET',
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (purpose === 'INVITE' ? 7 * 24 * 60 : 60) * 60 * 1000);

    await this.db.insert(authTokens).values({
      userId,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      purpose,
      expiresAt,
    });

    return `${this.config.get('FRONTEND_URL', { infer: true })}/reset-password?token=${token}`;
  }

  async updateDriveFolder(id: string, driveFolderUrl: string): Promise<ClientRecord> {
    await this.findOne(id);

    const [client] = await this.db
      .update(clients)
      .set({
        driveFolderUrl,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();

    return client;
  }

  /**
   * Re-runs Drive provisioning for a client. Backs the automation retry endpoint
   * so a FAILED drive-folder-provisioned log can be re-attempted.
   */
  async retryDriveProvisioning(clientId: string): Promise<void> {
    const client = await this.findOne(clientId);
    await this.provisionDriveFolder(client);
  }

  private async provisionDriveFolder(client: ClientRecord): Promise<void> {
    // Accept either env name: the legacy DRIVE_CLIENTS_PARENT_FOLDER_ID takes
    // precedence, otherwise fall back to GOOGLE_DRIVE_CLIENTS_PARENT_FOLDER_ID
    // (which defaults to 'root' = My Drive). This avoids a silent no-op when only
    // the GOOGLE_-prefixed variable is set on the deployment.
    const parentFolderId =
      this.config.get('DRIVE_CLIENTS_PARENT_FOLDER_ID', { infer: true }) ??
      this.config.get('GOOGLE_DRIVE_CLIENTS_PARENT_FOLDER_ID', { infer: true });

    if (!this.driveService || !parentFolderId) {
      return;
    }

    try {
      const driveFolderUrl = await this.driveService.provisionClientFolder(
        client.businessName,
        parentFolderId,
      );

      await this.updateDriveFolder(client.id, driveFolderUrl);

      void this.automationService.logEvent({
        eventName: 'drive-folder-provisioned',
        entityType: 'client',
        entityId: client.id,
        payload: { driveFolderUrl },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to provision Drive folder for client ${client.id}: ${message}`);

      void this.automationService.logEvent({
        eventName: 'drive-folder-provisioned',
        entityType: 'client',
        entityId: client.id,
        status: 'FAILED',
        errorMessage: message,
      });
    }
  }
}
