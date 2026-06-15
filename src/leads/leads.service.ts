import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { AutomationService } from '../automation/automation.service';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { clients, leads } from '../database/schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

type LeadRecord = typeof leads.$inferSelect;

@Injectable()
export class LeadsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly automationService: AutomationService,
  ) {}

  async create(input: CreateLeadDto): Promise<LeadRecord> {
    let lead: LeadRecord;

    try {
      [lead] = await this.db
        .insert(leads)
        .values({
          businessName: input.businessName,
          contactPerson: input.contactPerson,
          email: input.email.toLowerCase(),
          phone: input.phone,
          source: input.source ?? 'Website lead form',
          message: input.message,
          status: 'NEW',
        })
        .returning();
    } catch (error) {
      throw new OperationError('Failed to create lead.', 'leads.create', {
        stage: 'insert-lead',
        businessName: input.businessName,
      }, error);
    }

    await this.automationService.emitEvent({
      eventName: 'lead-created',
      entityType: 'lead',
      entityId: lead.id,
      payload: {
        leadId: lead.id,
        businessName: lead.businessName,
        contactPerson: lead.contactPerson,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        message: lead.message,
        status: lead.status,
      },
    });

    return lead;
  }

  async findAll(): Promise<LeadRecord[]> {
    return this.db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async findOne(id: string): Promise<LeadRecord> {
    const [lead] = await this.db.select().from(leads).where(eq(leads.id, id)).limit(1);

    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }

    return lead;
  }

  async update(id: string, input: UpdateLeadDto): Promise<LeadRecord> {
    await this.findOne(id);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
    }

    const [lead] = await this.db
      .update(leads)
      .set({
        ...input,
        email: input.email?.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    return lead;
  }

  async convertToClient(id: string): Promise<LeadRecord> {
    const lead = await this.findOne(id);

    if (lead.clientId) {
      throw new BadRequestException('Lead is already linked to a client.');
    }

    const [client] = await this.db
      .insert(clients)
      .values({
        businessName: lead.businessName,
        contactPerson: lead.contactPerson,
        email: lead.email,
        phone: lead.phone,
        status: 'ONBOARDING',
        goals: lead.message,
        servicesNeeded: [],
        socialLinks: {},
      })
      .returning();

    const [updatedLead] = await this.db
      .update(leads)
      .set({
        status: 'WON',
        clientId: client.id,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    await this.automationService.emitEvent({
      eventName: 'client-created',
      entityType: 'client',
      entityId: client.id,
      payload: {
        clientId: client.id,
        businessName: client.businessName,
        contactPerson: client.contactPerson,
        email: client.email,
        status: client.status,
        sourceLeadId: lead.id,
      },
    });

    return updatedLead;
  }

  private async ensureClientExists(clientId: string) {
    const [client] = await this.db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }
}
