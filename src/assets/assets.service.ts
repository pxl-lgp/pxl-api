import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { OperationError } from '../common/errors/operation-error';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { assets, clients, contentItems } from '../database/schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

type AssetRecord = typeof assets.$inferSelect;

@Injectable()
export class AssetsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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

  async findAll(): Promise<AssetRecord[]> {
    return this.db.select().from(assets).orderBy(desc(assets.createdAt));
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
