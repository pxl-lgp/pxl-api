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
import { and, desc, eq } from 'drizzle-orm';
import { AutomationService } from '../automation/automation.service';
import { AppConfig } from '../config/app.config';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { DriveService } from '../drive/drive.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OnboardingTasksService } from '../onboarding-tasks/onboarding-tasks.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { clients, DEFAULT_ORGANIZATION_ID, users } from '../database/schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

type ClientRecord = typeof clients.$inferSelect;
const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService<AppConfig, true>,
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
  ): Promise<ClientRecord> {
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

    return client;
  }

  async createWithPortalUser(
    input: Omit<CreateClientDto, 'createPortalUser' | 'portalPassword'>,
    organizationId = DEFAULT_ORGANIZATION_ID,
    password: string,
  ): Promise<ClientRecord> {
    const email = input.email?.trim().toLowerCase();

    if (!email) {
      throw new BadRequestException('Email is required to create a client portal user.');
    }

    const passwordHash = await hash(password, PASSWORD_SALT_ROUNDS);
    let client: ClientRecord;

    try {
      client = await this.db.transaction(async (tx) => {
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
    void this.workspaceService.postActivity({
      organizationId: client.organizationId,
      event: 'client-created',
      body: `Client created: ${client.businessName}`,
      href: `/admin/clients/${client.id}`,
      metadata: { clientId: client.id, userId: client.userId },
    });

    return client;
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

  async findAll(organizationId: string): Promise<ClientRecord[]> {
    return this.db
      .select()
      .from(clients)
      .where(eq(clients.organizationId, organizationId))
      .orderBy(desc(clients.createdAt));
  }

  async findOne(id: string, organizationId?: string): Promise<ClientRecord> {
    const [client] = await this.db
      .select()
      .from(clients)
      .where(
        organizationId
          ? and(eq(clients.id, id), eq(clients.organizationId, organizationId))
          : eq(clients.id, id),
      )
      .limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }

  async update(id: string, input: UpdateClientDto, organizationId: string): Promise<ClientRecord> {
    await this.findOne(id, organizationId);

    const [client] = await this.db
      .update(clients)
      .set({
        ...input,
        email: input.email?.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
      .returning();

    return client;
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
