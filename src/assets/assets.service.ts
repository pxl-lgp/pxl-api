import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, SQL } from 'drizzle-orm';
import { AiService } from '../ai/ai.service';
import { OperationError } from '../common/errors/operation-error';
import { normalizeSearchTerm } from '../common/query.util';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { assets, clients, contentItems } from '../database/schema';
import { AssetQueryDto } from './dto/asset-query.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

type AssetRecord = typeof assets.$inferSelect;

@Injectable()
export class AssetsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly aiService: AiService,
  ) {}

  async create(input: CreateAssetDto, organizationId: string): Promise<AssetRecord> {
    await this.ensureClientExists(input.clientId, organizationId);

    if (input.contentItemId) {
      await this.ensureContentItemExists(input.contentItemId, organizationId);
    }

    try {
      const [asset] = await this.db
        .insert(assets)
        .values({
          clientId: input.clientId,
          contentItemId: input.contentItemId,
          name: input.name,
          assetType: input.assetType,
          driveUrl: input.driveUrl,
          version: input.version ?? 1,
          tags: input.tags ?? [],
        })
        .returning();

      return asset;
    } catch (error) {
      throw new OperationError(
        'Failed to create asset.',
        'assets.create',
        {
          stage: 'insert-asset',
          clientId: input.clientId,
          name: input.name,
        },
        error,
      );
    }
  }

  async findAll(filter: AssetQueryDto = {}, organizationId: string): Promise<AssetRecord[]> {
    const conditions: SQL[] = [];

    if (filter.clientId) {
      conditions.push(eq(assets.clientId, filter.clientId));
    }

    if (filter.contentItemId) {
      conditions.push(eq(assets.contentItemId, filter.contentItemId));
    }

    if (filter.assetType) {
      conditions.push(eq(assets.assetType, filter.assetType));
    }

    const search = normalizeSearchTerm(filter.q);
    if (search) {
      conditions.push(ilike(assets.name, search));
    }

    const rows = await this.db
      .select({ asset: assets })
      .from(assets)
      .innerJoin(clients, eq(assets.clientId, clients.id))
      .where(and(eq(clients.organizationId, organizationId), ...conditions))
      .orderBy(desc(assets.createdAt));

    return rows.map((row) => row.asset);
  }

  async findOne(id: string, organizationId: string): Promise<AssetRecord> {
    const [row] = await this.db
      .select({ asset: assets })
      .from(assets)
      .innerJoin(clients, eq(assets.clientId, clients.id))
      .where(and(eq(assets.id, id), eq(clients.organizationId, organizationId)))
      .limit(1);
    const asset = row?.asset;

    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }

    return asset;
  }

  async update(id: string, input: UpdateAssetDto, organizationId: string): Promise<AssetRecord> {
    await this.findOne(id, organizationId);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId, organizationId);
    }

    if (input.contentItemId) {
      await this.ensureContentItemExists(input.contentItemId, organizationId);
    }

    const [asset] = await this.db
      .update(assets)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();

    return asset;
  }

  /**
   * AI-suggests library tags for an asset and merges them with any existing tags
   * (Workflow Study §12: AI tagging + searchable archives). Falls back to a
   * deterministic draft when no AI provider is configured.
   */
  async autoTag(id: string, organizationId: string): Promise<AssetRecord> {
    const asset = await this.findOne(id, organizationId);
    const result = await this.aiService.generateTags({
      clientName: asset.name,
      contentTitle: asset.name,
      contentType: asset.assetType,
    });

    const suggested = result.output
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean);
    const merged = [...new Set([...asset.tags, ...suggested])];

    const [updated] = await this.db
      .update(assets)
      .set({ tags: merged, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();

    return updated;
  }

  private async ensureClientExists(clientId: string, organizationId: string) {
    const [client] = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }

  private async ensureContentItemExists(contentItemId: string, organizationId: string) {
    const [contentItem] = await this.db
      .select({ id: contentItems.id })
      .from(contentItems)
      .innerJoin(clients, eq(contentItems.clientId, clients.id))
      .where(and(eq(contentItems.id, contentItemId), eq(clients.organizationId, organizationId)))
      .limit(1);

    if (!contentItem) {
      throw new NotFoundException('Content item not found.');
    }

    return contentItem;
  }
}
