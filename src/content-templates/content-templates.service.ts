import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, isNull, or } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { clients, contentTemplates } from '../database/schema';
import { CreateContentTemplateDto } from './dto/create-content-template.dto';
import { UpdateContentTemplateDto } from './dto/update-content-template.dto';

type ContentTemplateRecord = typeof contentTemplates.$inferSelect;

@Injectable()
export class ContentTemplatesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateContentTemplateDto): Promise<ContentTemplateRecord> {
    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
    }

    try {
      const [template] = await this.db
        .insert(contentTemplates)
        .values({
          clientId: input.clientId ?? null,
          name: input.name,
          contentType: input.contentType,
          platform: input.platform,
          body: input.body,
        })
        .returning();

      return template;
    } catch (error) {
      throw new OperationError(
        'Failed to create content template.',
        'content-templates.create',
        {
          stage: 'insert-content-template',
          clientId: input.clientId,
        },
        error,
      );
    }
  }

  /**
   * Lists templates available to a client: shared (clientId NULL) plus that
   * client's own. With no clientId, returns every template.
   */
  async findAvailable(clientId?: string): Promise<ContentTemplateRecord[]> {
    if (clientId) {
      await this.ensureClientExists(clientId);

      return this.db
        .select()
        .from(contentTemplates)
        .where(or(isNull(contentTemplates.clientId), eq(contentTemplates.clientId, clientId)))
        .orderBy(asc(contentTemplates.name));
    }

    return this.db.select().from(contentTemplates).orderBy(asc(contentTemplates.name));
  }

  async findOne(id: string): Promise<ContentTemplateRecord> {
    const [template] = await this.db
      .select()
      .from(contentTemplates)
      .where(eq(contentTemplates.id, id))
      .limit(1);

    if (!template) {
      throw new NotFoundException('Content template not found.');
    }

    return template;
  }

  async update(id: string, input: UpdateContentTemplateDto): Promise<ContentTemplateRecord> {
    await this.findOne(id);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
    }

    const [template] = await this.db
      .update(contentTemplates)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(contentTemplates.id, id))
      .returning();

    return template;
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.findOne(id);
    await this.db.delete(contentTemplates).where(eq(contentTemplates.id, id));

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
