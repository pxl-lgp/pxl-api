import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, SQL } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { normalizeSearchTerm } from '../common/query.util';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { campaigns, clients } from '../database/schema';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

type CampaignRecord = typeof campaigns.$inferSelect;

@Injectable()
export class CampaignsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateCampaignDto): Promise<CampaignRecord> {
    await this.ensureClientExists(input.clientId);

    try {
      const [campaign] = await this.db
        .insert(campaigns)
        .values({
          clientId: input.clientId,
          name: input.name,
          status: input.status ?? 'PLANNED',
          goal: input.goal,
          budget: input.budget,
          audience: input.audience,
          offer: input.offer,
          notes: input.notes,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        })
        .returning();

      return campaign;
    } catch (error) {
      throw new OperationError('Failed to create campaign.', 'campaigns.create', {
        stage: 'insert-campaign',
        clientId: input.clientId,
      }, error);
    }
  }

  async findAll(filter: CampaignQueryDto = {}): Promise<CampaignRecord[]> {
    const conditions: SQL[] = [];

    if (filter.clientId) {
      conditions.push(eq(campaigns.clientId, filter.clientId));
    }

    if (filter.status) {
      conditions.push(eq(campaigns.status, filter.status));
    }

    const search = normalizeSearchTerm(filter.q);
    if (search) {
      conditions.push(ilike(campaigns.name, search));
    }

    return this.db
      .select()
      .from(campaigns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(campaigns.createdAt));
  }

  async findOne(id: string): Promise<CampaignRecord> {
    const [campaign] = await this.db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);

    if (!campaign) {
      throw new NotFoundException('Campaign not found.');
    }

    return campaign;
  }

  async update(id: string, input: UpdateCampaignDto): Promise<CampaignRecord> {
    await this.findOne(id);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
    }

    const [campaign] = await this.db
      .update(campaigns)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();

    return campaign;
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.findOne(id);
    await this.db.delete(campaigns).where(eq(campaigns.id, id));

    return { deleted: true, id };
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const [client] = await this.db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }
  }
}
