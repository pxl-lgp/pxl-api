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

  async create(input: CreateAssetDto): Promise<AssetRecord> {
    await this.ensureClientExists(input.clientId);

    if (input.contentItemId) {
      await this.ensureContentItemExists(input.contentItemId);
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
      throw new OperationError('Failed to create asset.', 'assets.create', {
        stage: 'insert-asset',
        clientId: input.clientId,
        name: input.name,
      }, error);
    }
  }

  async findAll(filter: AssetQueryDto = {}): Promise<AssetRecord[]> {
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

    return this.db
      .select()
      .from(assets)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(assets.createdAt));
  }

  async findOne(id: string): Promise<AssetRecord> {
    const [asset] = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);

    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }

    return asset;
  }

  async update(id: string, input: UpdateAssetDto): Promise<AssetRecord> {
    await this.findOne(id);

    if (input.clientId) {
      await this.ensureClientExists(input.clientId);
    }

    if (input.contentItemId) {
      await this.ensureContentItemExists(input.contentItemId);
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
  async autoTag(id: string): Promise<AssetRecord> {
    const asset = await this.findOne(id);
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

  private async ensureClientExists(clientId: string) {
    const [client] = await this.db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }

  private async ensureContentItemExists(contentItemId: string) {
    const [contentItem] = await this.db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.id, contentItemId))
      .limit(1);

    if (!contentItem) {
      throw new NotFoundException('Content item not found.');
    }

    return contentItem;
  }
}
