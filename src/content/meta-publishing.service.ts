import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { TokenEncryptionService } from '../social-connections/token-encryption.service';
import { SocialPlatform } from './social-platform';

type MetaPublishInput = {
  platform: SocialPlatform;
  contentType: string;
  caption: string | null;
  hashtags: string[];
  mediaUrl: string | null;
  connection: {
    facebookPageId: string;
    instagramAccountId: string | null;
    pageAccessTokenEncrypted: string;
  };
};

type MetaResponse = {
  id?: string;
  post_id?: string;
  status_code?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

@Injectable()
export class MetaPublishingService {
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly tokenEncryption: TokenEncryptionService,
  ) {}

  async publish(input: MetaPublishInput): Promise<{ remoteId: string }> {
    const accessToken = this.tokenEncryption.decrypt(input.connection.pageAccessTokenEncrypted);

    if (input.platform === 'FACEBOOK_PAGE') {
      return this.publishFacebookPage(input, accessToken);
    }

    return this.publishInstagram(input, accessToken);
  }

  private async publishFacebookPage(
    input: MetaPublishInput,
    accessToken: string,
  ): Promise<{ remoteId: string }> {
    const pageId = input.connection.facebookPageId;

    const message = this.buildCaption(input.caption, input.hashtags);
    const isVideo = this.isVideo(input.contentType, input.mediaUrl);
    let response: MetaResponse;

    if (input.mediaUrl && isVideo) {
      response = await this.metaRequest(
        `${pageId}/videos`,
        {
          file_url: input.mediaUrl,
          description: message,
        },
        accessToken,
      );
    } else if (input.mediaUrl) {
      response = await this.metaRequest(
        `${pageId}/photos`,
        {
          url: input.mediaUrl,
          caption: message,
        },
        accessToken,
      );
    } else {
      if (!message) {
        throw new BadRequestException(
          'Facebook Page publishing requires a caption or a media URL.',
        );
      }

      response = await this.metaRequest(
        `${pageId}/feed`,
        {
          message,
        },
        accessToken,
      );
    }

    const remoteId = response.post_id ?? response.id;

    if (!remoteId) {
      throw new BadGatewayException(
        'Meta accepted the Facebook request without returning a post ID.',
      );
    }

    return { remoteId };
  }

  private async publishInstagram(
    input: MetaPublishInput,
    accessToken: string,
  ): Promise<{ remoteId: string }> {
    const accountId = input.connection.instagramAccountId;

    if (!accountId) {
      throw new BadRequestException(
        'This Facebook Page does not have a connected Instagram professional account.',
      );
    }

    if (!input.mediaUrl) {
      throw new BadRequestException(
        'Instagram publishing requires a publicly reachable media URL.',
      );
    }

    const isVideo = this.isVideo(input.contentType, input.mediaUrl);
    const container = await this.metaRequest(
      `${accountId}/media`,
      {
        ...(isVideo
          ? { media_type: 'REELS', video_url: input.mediaUrl }
          : { image_url: input.mediaUrl }),
        caption: this.buildCaption(input.caption, input.hashtags),
      },
      accessToken,
    );

    if (!container.id) {
      throw new BadGatewayException('Meta did not return an Instagram media container ID.');
    }

    if (isVideo) {
      await this.waitForInstagramContainer(container.id, accessToken);
    }

    const published = await this.metaRequest(
      `${accountId}/media_publish`,
      { creation_id: container.id },
      accessToken,
    );

    if (!published.id) {
      throw new BadGatewayException('Meta did not return an Instagram media ID.');
    }

    return { remoteId: published.id };
  }

  private async waitForInstagramContainer(containerId: string, accessToken: string): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await this.metaGet(`${containerId}?fields=status_code`, accessToken);

      if (status.status_code === 'FINISHED') {
        return;
      }

      if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
        throw new BadGatewayException(
          `Instagram media processing ended with status ${status.status_code}.`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new BadGatewayException('Instagram media processing timed out.');
  }

  private async metaRequest(
    path: string,
    input: Record<string, string>,
    accessToken: string,
  ): Promise<MetaResponse> {
    return this.request(path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(input),
    });
  }

  private async metaGet(path: string, accessToken: string): Promise<MetaResponse> {
    return this.request(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  private async request(path: string, init: RequestInit): Promise<MetaResponse> {
    const version = this.config.get('META_GRAPH_API_VERSION', { infer: true });
    const response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
      ...init,
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await response.json().catch(() => ({}))) as MetaResponse;

    if (!response.ok || body.error) {
      const detail = body.error?.message ?? `HTTP ${response.status}`;
      throw new BadGatewayException(`Meta publishing failed: ${detail}`);
    }

    return body;
  }

  private buildCaption(caption: string | null, hashtags: string[]): string {
    return [caption?.trim(), hashtags.map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')]
      .filter(Boolean)
      .join('\n\n');
  }

  private isVideo(contentType: string, mediaUrl: string | null): boolean {
    const normalized = `${contentType} ${mediaUrl ?? ''}`.toLowerCase();

    return (
      normalized.includes('video') ||
      normalized.includes('reel') ||
      /\.(mp4|mov|m4v|webm)(?:$|\?)/.test(normalized)
    );
  }
}
