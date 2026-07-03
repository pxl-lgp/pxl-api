import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull, or } from 'drizzle-orm';
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

  async create(input: CreateContentTemplateDto, organizationId: string): Promise<ContentTemplateRecord> {
    if (input.clientId) {
      await this.ensureClientExists(input.clientId, organizationId);
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
   * Lists shared templates plus templates that belong to clients in the caller's organization.
   */
  async findAvailable(
    organizationId: string,
    clientId?: string,
  ): Promise<ContentTemplateRecord[]> {
    if (clientId) {
      await this.ensureClientExists(clientId, organizationId);

      return this.db
        .select()
        .from(contentTemplates)
        .where(or(isNull(contentTemplates.clientId), eq(contentTemplates.clientId, clientId)))
        .orderBy(asc(contentTemplates.name));
    }

    const rows = await this.db
      .select({ template: contentTemplates })
      .from(contentTemplates)
      .leftJoin(clients, eq(contentTemplates.clientId, clients.id))
      .where(or(isNull(contentTemplates.clientId), eq(clients.organizationId, organizationId)))
      .orderBy(asc(contentTemplates.name));

    return rows.map((row) => row.template);
  }

  async findOne(id: string, organizationId: string): Promise<ContentTemplateRecord> {
    const [row] = await this.db
      .select({ template: contentTemplates })
      .from(contentTemplates)
      .leftJoin(clients, eq(contentTemplates.clientId, clients.id))
      .where(
        and(
          eq(contentTemplates.id, id),
          or(isNull(contentTemplates.clientId), eq(clients.organizationId, organizationId)),
        ),
      )
      .limit(1);
    const template = row?.template;

    if (!template) {
      throw new NotFoundException('Content template not found.');
    }

    return template;
  }

  async update(
    id: string,
    input: UpdateContentTemplateDto,
    organizationId: string,
  ): Promise<ContentTemplateRecord> {
    await this.findOne(id, organizationId);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId, organizationId);
    }

    const [template] = await this.db
      .update(contentTemplates)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(contentTemplates.id, id))
      .returning();

    return template;
  }

  async remove(id: string, organizationId: string): Promise<{ deleted: true; id: string }> {
    await this.findOne(id, organizationId);
    await this.db.delete(contentTemplates).where(eq(contentTemplates.id, id));

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
