import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
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

  async create(input: CreateContentPillarDto): Promise<ContentPillarRecord> {
    await this.ensureClientExists(input.clientId);

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
      throw new OperationError('Failed to create content pillar.', 'content-pillars.create', {
        stage: 'insert-content-pillar',
        clientId: input.clientId,
      }, error);
    }
  }

  async findForClient(clientId: string): Promise<ContentPillarRecord[]> {
    await this.ensureClientExists(clientId);

    return this.db
      .select()
      .from(contentPillars)
      .where(eq(contentPillars.clientId, clientId))
      .orderBy(asc(contentPillars.name));
  }

  async findOne(id: string): Promise<ContentPillarRecord> {
    const [pillar] = await this.db
      .select()
      .from(contentPillars)
      .where(eq(contentPillars.id, id))
      .limit(1);

    if (!pillar) {
      throw new NotFoundException('Content pillar not found.');
    }

    return pillar;
  }

  async update(id: string, input: UpdateContentPillarDto): Promise<ContentPillarRecord> {
    await this.findOne(id);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
    }

    const [pillar] = await this.db
      .update(contentPillars)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(contentPillars.id, id))
      .returning();

    return pillar;
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.findOne(id);
    await this.db.delete(contentPillars).where(eq(contentPillars.id, id));

    return { deleted: true, id };
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const [client] = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }
  }
}
