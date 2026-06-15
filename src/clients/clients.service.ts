import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { AutomationService } from '../automation/automation.service';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { clients } from '../database/schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

type ClientRecord = typeof clients.$inferSelect;

@Injectable()
export class ClientsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly automationService: AutomationService,
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

    try {
      await this.automationService.emitEvent({
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
        },
      });
    } catch (error) {
      throw new OperationError('Client was created, but automation event logging failed.', 'clients.create', {
        stage: 'log-client-created-event',
        clientId: client.id,
        businessName: client.businessName,
      }, error);
    }

    return client;
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
}
