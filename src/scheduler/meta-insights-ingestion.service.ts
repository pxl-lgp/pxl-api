import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { AutomationService } from '../automation/automation.service';
import { AppConfig } from '../config/app.config';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { analytics, contentItems, socialConnections, SocialPublishResult } from '../database/schema';
import { TokenEncryptionService } from '../social-connections/token-encryption.service';

// Serialises the ingestion sweep across API instances.
const INSIGHTS_SWEEP_LOCK_KEY = 4815162344;
const LOOKBACK_DAYS = 14;
const REFRESH_INTERVAL_HOURS = 12;

type Metrics = {
  reach: number;
  impressions: number;
  engagement: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followersGained: number;
};

type InsightsResponse = {
  data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
  error?: { message?: string };
};

type EngagementFieldsResponse = {
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
  error?: { message?: string };
};

const EMPTY_METRICS: Metrics = {
  reach: 0,
  impressions: 0,
  engagement: 0,
  clicks: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  followersGained: 0,
};

/**
 * Pulls performance metrics from the Meta Graph API for recently published content
 * and writes analytics rows (Workflow Study §10: automated performance monitoring),
 * replacing manual metric entry.
 *
 * NOTE: the exact Graph metric names differ between Facebook Page posts and
 * Instagram media and across Graph API versions. The mapping below is best-effort
 * and should be validated against the live API for the configured version; every
 * call is wrapped so a mismatch degrades to 0 rather than failing the sweep.
 */
@Injectable()
export class MetaInsightsIngestionService {
  private readonly logger = new Logger(MetaInsightsIngestionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly tokenEncryption: TokenEncryptionService,
    private readonly automationService: AutomationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async ingest(): Promise<void> {
    await this.db.transaction(async (tx) => {
      const lockResult = await tx.execute(
        sql`select pg_try_advisory_xact_lock(${INSIGHTS_SWEEP_LOCK_KEY}::bigint) as locked`,
      );
      const locked = (lockResult.rows[0] as { locked?: boolean } | undefined)?.locked === true;

      if (!locked) {
        return;
      }

      await this.runIngestion();
    });
  }

  private async runIngestion(): Promise<void> {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const due = await this.db
      .select({
        id: contentItems.id,
        clientId: contentItems.clientId,
        publishResults: contentItems.publishResults,
      })
      .from(contentItems)
      .where(and(eq(contentItems.status, 'PUBLISHED'), gte(contentItems.publishedAt, since)));

    if (due.length === 0) {
      return;
    }

    const recentlyIngested = await this.recentlyIngestedIds(due.map((item) => item.id));
    const connections = await this.loadConnections(due);

    for (const item of due) {
      if (recentlyIngested.has(item.id)) {
        continue;
      }

      const results = Object.values(item.publishResults ?? {}).filter(
        (result): result is SocialPublishResult =>
          result?.status === 'SUCCEEDED' && Boolean(result.remoteId) && Boolean(result.connectionId),
      );

      if (results.length === 0) {
        continue;
      }

      const metrics = { ...EMPTY_METRICS };
      let collected = false;

      for (const result of results) {
        const connection = connections.get(result.connectionId ?? '');

        if (!connection) {
          continue;
        }

        try {
          const fetched = await this.fetchMetrics(result, connection.token);
          this.accumulate(metrics, fetched);
          collected = true;
        } catch (error) {
          this.logger.warn(
            `Insights fetch failed for content ${item.id} (${result.platform}): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      if (!collected) {
        continue;
      }

      await this.db.insert(analytics).values({ contentItemId: item.id, ...metrics });

      void this.automationService
        .logEvent({
          eventName: 'analytics-ingested',
          entityType: 'content',
          entityId: item.id,
          payload: { clientId: item.clientId, ...metrics },
        })
        .catch(() => undefined);
    }
  }

  private async recentlyIngestedIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }

    const cutoff = new Date(Date.now() - REFRESH_INTERVAL_HOURS * 60 * 60 * 1000);
    const rows = await this.db
      .select({ contentItemId: analytics.contentItemId })
      .from(analytics)
      .where(and(inArray(analytics.contentItemId, ids), gte(analytics.capturedAt, cutoff)));

    return new Set(rows.map((row) => row.contentItemId));
  }

  private async loadConnections(
    due: Array<{ publishResults: Record<string, SocialPublishResult> }>,
  ): Promise<Map<string, { token: string; platform: string }>> {
    const connectionIds = [
      ...new Set(
        due.flatMap((item) =>
          Object.values(item.publishResults ?? {})
            .map((result) => result.connectionId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];

    const map = new Map<string, { token: string; platform: string }>();

    if (connectionIds.length === 0) {
      return map;
    }

    const rows = await this.db
      .select()
      .from(socialConnections)
      .where(inArray(socialConnections.id, connectionIds));

    for (const row of rows) {
      try {
        map.set(row.id, {
          token: this.tokenEncryption.decrypt(row.pageAccessTokenEncrypted),
          platform: row.instagramAccountId ? 'INSTAGRAM' : 'FACEBOOK_PAGE',
        });
      } catch {
        // Skip connections whose token cannot be decrypted (e.g. key rotated).
      }
    }

    return map;
  }

  private async fetchMetrics(result: SocialPublishResult, token: string): Promise<Partial<Metrics>> {
    if (result.platform === 'INSTAGRAM') {
      return this.fetchInstagramMetrics(result.remoteId as string, token);
    }

    return this.fetchFacebookMetrics(result.remoteId as string, token);
  }

  private async fetchInstagramMetrics(mediaId: string, token: string): Promise<Partial<Metrics>> {
    const insights = await this.graphGet<InsightsResponse>(
      `${mediaId}/insights?metric=impressions,reach,likes,comments,saved,shares,total_interactions`,
      token,
    );
    const byName = this.indexInsights(insights);

    const likes = byName.likes ?? 0;
    const comments = byName.comments ?? 0;
    const shares = byName.shares ?? 0;
    const saves = byName.saved ?? 0;
    const engagement = byName.total_interactions ?? likes + comments + shares + saves;

    return {
      impressions: byName.impressions ?? 0,
      reach: byName.reach ?? 0,
      likes,
      comments,
      shares,
      saves,
      engagement,
    };
  }

  private async fetchFacebookMetrics(postId: string, token: string): Promise<Partial<Metrics>> {
    const insights = await this.graphGet<InsightsResponse>(
      `${postId}/insights?metric=post_impressions,post_impressions_unique,post_clicks`,
      token,
    );
    const byName = this.indexInsights(insights);

    const fields = await this.graphGet<EngagementFieldsResponse>(
      `${postId}?fields=reactions.summary(true).limit(0),comments.summary(true).limit(0),shares`,
      token,
    );
    const likes = fields.reactions?.summary?.total_count ?? 0;
    const comments = fields.comments?.summary?.total_count ?? 0;
    const shares = fields.shares?.count ?? 0;

    return {
      impressions: byName.post_impressions ?? 0,
      reach: byName.post_impressions_unique ?? 0,
      clicks: byName.post_clicks ?? 0,
      likes,
      comments,
      shares,
      engagement: likes + comments + shares,
    };
  }

  private indexInsights(response: InsightsResponse): Record<string, number> {
    const index: Record<string, number> = {};

    for (const metric of response.data ?? []) {
      if (metric.name) {
        index[metric.name] = metric.values?.[0]?.value ?? 0;
      }
    }

    return index;
  }

  private accumulate(target: Metrics, source: Partial<Metrics>): void {
    for (const key of Object.keys(target) as Array<keyof Metrics>) {
      target[key] += source[key] ?? 0;
    }
  }

  private async graphGet<T extends { error?: { message?: string } }>(
    path: string,
    token: string,
  ): Promise<T> {
    const version = this.config.get('META_GRAPH_API_VERSION', { infer: true });
    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(
      `https://graph.facebook.com/${version}/${path}${separator}access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(30_000) },
    );
    const body = (await response.json().catch(() => ({}))) as T;

    if (!response.ok || body.error) {
      throw new Error(body.error?.message ?? `HTTP ${response.status}`);
    }

    return body;
  }
}
