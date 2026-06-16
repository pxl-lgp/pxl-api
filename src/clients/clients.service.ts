import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { desc, eq } from 'drizzle-orm';
import { AutomationService } from '../automation/automation.service';
import { AppConfig } from '../config/app.config';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { DriveService } from '../drive/drive.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OnboardingTasksService } from '../onboarding-tasks/onboarding-tasks.service';
import { clients } from '../database/schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

type ClientRecord = typeof clients.$inferSelect;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly automationService: AutomationService,
    private readonly notificationsService: NotificationsService,
    private readonly onboardingTasksService: OnboardingTasksService,
    @Optional() private readonly driveService: DriveService | null,
  ) {}

  async create(input: CreateClientDto): Promise<ClientRecord> {
    let client: ClientRecord;

    try {
      [client] = await this.db
        .insert(clients)
        .values({
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
      throw new OperationError('Failed to create client record.', 'clients.create', {
        stage: 'insert-client',
        businessName: input.businessName,
      }, error);
    }

    this.runClientCreatedAutomation(client);

    return client;
  }

  /**
   * Fires the side-effects every newly created client should get: Drive folder
   * provisioning, a team onboarding notification, and a client-created log event.
   * All run in the background so they never block or fail the caller. Shared by
   * direct client creation and lead-to-client conversion so both paths behave the
   * same way.
   */
  runClientCreatedAutomation(client: ClientRecord, extraPayload: Record<string, unknown> = {}): void {
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

    void this.automationService.logEvent({
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
    }).catch((error: unknown) => {
      this.logger.error(`Failed to log client-created event: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  async findAll(): Promise<ClientRecord[]> {
    return this.db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async findOne(id: string): Promise<ClientRecord> {
    const [client] = await this.db.select().from(clients).where(eq(clients.id, id)).limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }

  async update(id: string, input: UpdateClientDto): Promise<ClientRecord> {
    await this.findOne(id);

    const [client] = await this.db
      .update(clients)
      .set({
        ...input,
        email: input.email?.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
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
