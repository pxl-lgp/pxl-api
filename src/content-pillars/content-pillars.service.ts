import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { clients, contentPillars } from '../database/schema';
import { CreateContentPillarDto } from './dto/create-content-pillar.dto';
import { UpdateContentPillarDto } from './dto/update-content-pillar.dto';

type ContentPillarRecord = typeof contentPillars.$inferSelect;

@Injectable()
export class ContentPillarsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateContentPillarDto, organizationId: string): Promise<ContentPillarRecord> {
    await this.ensureClientExists(input.clientId, organizationId);

    try {
      const [pillar] = await this.db
        .insert(contentPillars)
        .values({
          clientId: input.clientId,
          name: input.name,
          description: input.description,
          cadencePerMonth: input.cadencePerMonth ?? 0,
        })
        .returning();

      return pillar;
    } catch (error) {
      throw new OperationError(
        'Failed to create content pillar.',
        'content-pillars.create',
        {
          stage: 'insert-content-pillar',
          clientId: input.clientId,
        },
        error,
      );
    }
  }

  async findForClient(clientId: string, organizationId: string): Promise<ContentPillarRecord[]> {
    await this.ensureClientExists(clientId, organizationId);

    return this.db
      .select()
      .from(contentPillars)
      .where(eq(contentPillars.clientId, clientId))
      .orderBy(asc(contentPillars.name));
  }

  async findOne(id: string, organizationId: string): Promise<ContentPillarRecord> {
    const [row] = await this.db
      .select({ pillar: contentPillars })
      .from(contentPillars)
      .innerJoin(clients, eq(contentPillars.clientId, clients.id))
      .where(and(eq(contentPillars.id, id), eq(clients.organizationId, organizationId)))
      .limit(1);
    const pillar = row?.pillar;

    if (!pillar) {
      throw new NotFoundException('Content pillar not found.');
    }

    return pillar;
  }

  async update(
    id: string,
    input: UpdateContentPillarDto,
    organizationId: string,
  ): Promise<ContentPillarRecord> {
    await this.findOne(id, organizationId);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId, organizationId);
    }

    const [pillar] = await this.db
      .update(contentPillars)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(contentPillars.id, id))
      .returning();

    return pillar;
  }

  async remove(id: string, organizationId: string): Promise<{ deleted: true; id: string }> {
    await this.findOne(id, organizationId);
    await this.db.delete(contentPillars).where(eq(contentPillars.id, id));

    return { deleted: true, id };
  }

  private async ensureClientExists(clientId: string, organizationId: string): Promise<void> {
    const [client] = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }
  }
}
