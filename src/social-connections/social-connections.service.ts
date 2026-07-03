import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AppConfig } from '../config/app.config';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import {
  clients,
  metaAuthorizations,
  metaOauthStates,
  socialConnections,
} from '../database/schema';
import { TokenEncryptionService } from './token-encryption.service';

type MetaTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: MetaError;
};

type MetaError = {
  message?: string;
  type?: string;
  code?: number;
};

type MetaUser = {
  id?: string;
  name?: string;
  error?: MetaError;
};

type MetaPermissionResponse = {
  data?: Array<{ permission: string; status: string }>;
  error?: MetaError;
};

type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
  };
};

type MetaPagesResponse = {
  data?: MetaPage[];
  paging?: {
    next?: string;
  };
  error?: MetaError;
};

@Injectable()
export class SocialConnectionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly tokenEncryption: TokenEncryptionService,
  ) {}

  async createMetaOauthUrl(clientId: string, user: AuthenticatedUser) {
    await this.ensureClientExists(clientId, user.organizationId);
    const settings = this.getMetaSettings();
    const nonce = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.db.insert(metaOauthStates).values({
      nonceHash: this.hashNonce(nonce),
      clientId,
      createdByUserId: user.id,
      expiresAt,
    });

    const params = new URLSearchParams({
      client_id: settings.appId,
      redirect_uri: settings.redirectUri,
      state: nonce,
      response_type: 'code',
      auth_type: 'rerequest',
      return_scopes: 'true',
    });

    if (settings.loginConfigId) {
      params.set('config_id', settings.loginConfigId);
      params.set('override_default_response_type', 'true');
    } else {
      params.set(
        'scope',
        [
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          'instagram_basic',
          'instagram_content_publish',
        ].join(','),
      );
    }

    return {
      url: `https://www.facebook.com/${settings.version}/dialog/oauth?${params.toString()}`,
      expiresAt,
    };
  }

  async completeMetaOauth(code: string, state: string) {
    const settings = this.getMetaSettings();
    const oauthState = await this.consumeOauthState(state);
    const shortToken = await this.exchangeCode(code, settings);
    const token = await this.exchangeLongLivedToken(shortToken.accessToken, settings);
    const metaUser = await this.metaGet<MetaUser>('me?fields=id,name', token.accessToken);

    if (!metaUser.id) {
      throw new BadGatewayException('Meta did not return the authorizing user ID.');
    }

    const permissions = await this.metaGet<MetaPermissionResponse>(
      'me/permissions',
      token.accessToken,
    );
    const grantedScopes =
      permissions.data
        ?.filter((permission) => permission.status === 'granted')
        .map((permission) => permission.permission) ?? [];
    const tokenExpiresAt = token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000) : null;
    const authorization = await this.upsertAuthorization({
      clientId: oauthState.clientId,
      connectedByUserId: oauthState.createdByUserId,
      metaUserId: metaUser.id,
      metaUserName: metaUser.name,
      accessToken: token.accessToken,
      tokenExpiresAt,
      scopes: grantedScopes,
    });
    const pages = await this.fetchAllPages(token.accessToken);

    await this.syncPageConnections({
      authorizationId: authorization.id,
      clientId: oauthState.clientId,
      pages,
      tokenExpiresAt,
    });

    return {
      clientId: oauthState.clientId,
      pageCount: pages.length,
    };
  }

  async list(clientId: string, organizationId: string) {
    await this.ensureClientExists(clientId, organizationId);

    return this.db
      .select({
        id: socialConnections.id,
        clientId: socialConnections.clientId,
        authorizationId: socialConnections.authorizationId,
        facebookPageId: socialConnections.facebookPageId,
        facebookPageName: socialConnections.facebookPageName,
        instagramAccountId: socialConnections.instagramAccountId,
        instagramUsername: socialConnections.instagramUsername,
        status: socialConnections.status,
        tokenExpiresAt: socialConnections.tokenExpiresAt,
        lastVerifiedAt: socialConnections.lastVerifiedAt,
        createdAt: socialConnections.createdAt,
        updatedAt: socialConnections.updatedAt,
      })
      .from(socialConnections)
      .where(eq(socialConnections.clientId, clientId))
      .orderBy(desc(socialConnections.updatedAt));
  }

  async disconnect(clientId: string, connectionId: string, organizationId: string) {
    await this.ensureClientExists(clientId, organizationId);

    const [connection] = await this.db
      .update(socialConnections)
      .set({
        status: 'REVOKED',
        updatedAt: new Date(),
      })
      .where(and(eq(socialConnections.id, connectionId), eq(socialConnections.clientId, clientId)))
      .returning();

    if (!connection) {
      throw new NotFoundException('Social connection not found.');
    }

    return {
      id: connection.id,
      clientId: connection.clientId,
      authorizationId: connection.authorizationId,
      facebookPageId: connection.facebookPageId,
      facebookPageName: connection.facebookPageName,
      instagramAccountId: connection.instagramAccountId,
      instagramUsername: connection.instagramUsername,
      status: connection.status,
      tokenExpiresAt: connection.tokenExpiresAt,
      lastVerifiedAt: connection.lastVerifiedAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  async syncAuthorization(clientId: string, authorizationId: string, organizationId: string) {
    await this.ensureClientExists(clientId, organizationId);

    const [authorization] = await this.db
      .select()
      .from(metaAuthorizations)
      .where(
        and(eq(metaAuthorizations.id, authorizationId), eq(metaAuthorizations.clientId, clientId)),
      )
      .limit(1);

    if (!authorization) {
      throw new NotFoundException('Meta authorization not found.');
    }

    if (authorization.tokenExpiresAt && authorization.tokenExpiresAt <= new Date()) {
      await this.db
        .update(metaAuthorizations)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(eq(metaAuthorizations.id, authorization.id));
      throw new BadRequestException('This Meta authorization expired. Connect the owner again.');
    }

    const accessToken = this.tokenEncryption.decrypt(authorization.accessTokenEncrypted);
    const pages = await this.fetchAllPages(accessToken);

    await this.syncPageConnections({
      authorizationId,
      clientId,
      pages,
      tokenExpiresAt: authorization.tokenExpiresAt,
    });

    await this.db
      .update(metaAuthorizations)
      .set({
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(metaAuthorizations.id, authorizationId));

    return this.list(clientId, organizationId);
  }

  private async consumeOauthState(nonce: string) {
    const nonceHash = this.hashNonce(nonce);
    const [state] = await this.db
      .select()
      .from(metaOauthStates)
      .where(and(eq(metaOauthStates.nonceHash, nonceHash), isNull(metaOauthStates.usedAt)))
      .limit(1);

    if (!state || state.expiresAt <= new Date()) {
      throw new BadRequestException('The Meta connection link is invalid or expired.');
    }

    const [consumed] = await this.db
      .update(metaOauthStates)
      .set({ usedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(metaOauthStates.id, state.id), isNull(metaOauthStates.usedAt)))
      .returning();

    if (!consumed) {
      throw new BadRequestException('The Meta connection link has already been used.');
    }

    void this.db
      .delete(metaOauthStates)
      .where(lt(metaOauthStates.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    return consumed;
  }

  private async exchangeCode(
    code: string,
    settings: ReturnType<SocialConnectionsService['getMetaSettings']>,
  ) {
    const params = new URLSearchParams({
      client_id: settings.appId,
      client_secret: settings.appSecret,
      redirect_uri: settings.redirectUri,
      code,
    });
    const result = await this.metaRequest<MetaTokenResponse>(
      `oauth/access_token?${params.toString()}`,
    );

    if (!result.access_token) {
      throw new BadGatewayException('Meta did not return an access token.');
    }

    return {
      accessToken: result.access_token,
      expiresIn: result.expires_in,
    };
  }

  private async exchangeLongLivedToken(
    accessToken: string,
    settings: ReturnType<SocialConnectionsService['getMetaSettings']>,
  ) {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: settings.appId,
      client_secret: settings.appSecret,
      fb_exchange_token: accessToken,
    });
    const result = await this.metaRequest<MetaTokenResponse>(
      `oauth/access_token?${params.toString()}`,
    );

    return {
      accessToken: result.access_token ?? accessToken,
      expiresIn: result.expires_in,
    };
  }

  private async fetchAllPages(accessToken: string): Promise<MetaPage[]> {
    const fields = [
      'id',
      'name',
      'access_token',
      'instagram_business_account{id,username,name}',
    ].join(',');
    let nextUrl: string | undefined = this.graphUrl(
      `me/accounts?fields=${encodeURIComponent(fields)}&limit=100`,
    );
    const pages: MetaPage[] = [];

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(60_000),
      });
      const body = (await response.json().catch(() => ({}))) as MetaPagesResponse;

      if (!response.ok || body.error) {
        throw new BadGatewayException(
          `Unable to load Facebook Pages: ${body.error?.message ?? `HTTP ${response.status}`}`,
        );
      }

      for (const page of body.data ?? []) {
        if (page.id && page.name && page.access_token) {
          pages.push(page);
        }
      }

      nextUrl = body.paging?.next;
    }

    return pages;
  }

  private async upsertAuthorization(input: {
    clientId: string;
    connectedByUserId: string;
    metaUserId: string;
    metaUserName?: string;
    accessToken: string;
    tokenExpiresAt: Date | null;
    scopes: string[];
  }) {
    const [existing] = await this.db
      .select()
      .from(metaAuthorizations)
      .where(
        and(
          eq(metaAuthorizations.clientId, input.clientId),
          eq(metaAuthorizations.metaUserId, input.metaUserId),
        ),
      )
      .limit(1);
    const values = {
      metaUserName: input.metaUserName,
      accessTokenEncrypted: this.tokenEncryption.encrypt(input.accessToken),
      tokenExpiresAt: input.tokenExpiresAt,
      scopes: input.scopes,
      status: 'CONNECTED' as const,
      connectedByUserId: input.connectedByUserId,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing) {
      const [authorization] = await this.db
        .update(metaAuthorizations)
        .set(values)
        .where(eq(metaAuthorizations.id, existing.id))
        .returning();

      return authorization;
    }

    const [authorization] = await this.db
      .insert(metaAuthorizations)
      .values({
        clientId: input.clientId,
        metaUserId: input.metaUserId,
        ...values,
      })
      .returning();

    return authorization;
  }

  private async syncPageConnections(input: {
    authorizationId: string;
    clientId: string;
    pages: MetaPage[];
    tokenExpiresAt: Date | null;
  }) {
    const pageIds = input.pages.map((page) => page.id);

    if (pageIds.length > 0) {
      const existingConnections = await this.db
        .select()
        .from(socialConnections)
        .where(
          and(
            eq(socialConnections.clientId, input.clientId),
            inArray(socialConnections.facebookPageId, pageIds),
          ),
        );
      const byPageId = new Map(
        existingConnections.map((connection) => [connection.facebookPageId, connection]),
      );

      for (const page of input.pages) {
        const values = {
          authorizationId: input.authorizationId,
          facebookPageName: page.name,
          instagramAccountId: page.instagram_business_account?.id,
          instagramUsername:
            page.instagram_business_account?.username ?? page.instagram_business_account?.name,
          pageAccessTokenEncrypted: this.tokenEncryption.encrypt(page.access_token),
          tokenExpiresAt: input.tokenExpiresAt,
          status: 'CONNECTED' as const,
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        };
        const existing = byPageId.get(page.id);

        if (existing) {
          await this.db
            .update(socialConnections)
            .set(values)
            .where(eq(socialConnections.id, existing.id));
        } else {
          await this.db.insert(socialConnections).values({
            clientId: input.clientId,
            facebookPageId: page.id,
            ...values,
          });
        }
      }
    }

    const authorizationConnections = await this.db
      .select({ id: socialConnections.id, facebookPageId: socialConnections.facebookPageId })
      .from(socialConnections)
      .where(eq(socialConnections.authorizationId, input.authorizationId));
    const activePageIds = new Set(pageIds);
    const revokedIds = authorizationConnections
      .filter((connection) => !activePageIds.has(connection.facebookPageId))
      .map((connection) => connection.id);

    if (revokedIds.length > 0) {
      await this.db
        .update(socialConnections)
        .set({ status: 'REVOKED', updatedAt: new Date() })
        .where(inArray(socialConnections.id, revokedIds));
    }
  }

  private async metaGet<T extends { error?: MetaError }>(
    path: string,
    accessToken: string,
  ): Promise<T> {
    return this.metaRequest<T>(path, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  private async metaRequest<T extends { error?: MetaError }>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(this.graphUrl(path), {
      ...init,
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await response.json().catch(() => ({}))) as T;

    if (!response.ok || body.error) {
      throw new BadGatewayException(
        `Meta connection failed: ${body.error?.message ?? `HTTP ${response.status}`}`,
      );
    }

    return body;
  }

  private graphUrl(path: string) {
    const version = this.config.get('META_GRAPH_API_VERSION', { infer: true });

    return `https://graph.facebook.com/${version}/${path}`;
  }

  private getMetaSettings() {
    const appId = this.config.get('META_APP_ID', { infer: true });
    const appSecret = this.config.get('META_APP_SECRET', { infer: true });
    const loginConfigId = this.config.get('META_LOGIN_CONFIG_ID', { infer: true });
    const redirectUri = this.config.get('META_OAUTH_REDIRECT_URI', { infer: true });
    const version = this.config.get('META_GRAPH_API_VERSION', { infer: true });

    if (!appId || !appSecret || !redirectUri) {
      throw new ServiceUnavailableException(
        'Meta OAuth is not configured. Set META_APP_ID, META_APP_SECRET, and META_OAUTH_REDIRECT_URI.',
      );
    }

    return { appId, appSecret, loginConfigId, redirectUri, version };
  }

  private hashNonce(value: string) {
    return createHash('sha256').update(value).digest('hex');
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
  }
}
