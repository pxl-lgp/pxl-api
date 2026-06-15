import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { AppConfig } from '../config/app.config';
import { MetaCallbackDto } from './dto/meta-callback.dto';
import { SocialConnectionsService } from './social-connections.service';

@ApiExcludeController()
@Controller('social-connections/meta')
export class MetaOauthCallbackController {
  constructor(
    private readonly socialConnectionsService: SocialConnectionsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Get('callback')
  async callback(@Query() query: MetaCallbackDto, @Res() response: Response) {
    const frontendUrl = this.config
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/$/, '');

    if (query.error || !query.code || !query.state) {
      const message = query.error_description ?? query.error ?? 'Meta authorization was cancelled.';
      response.redirect(
        `${frontendUrl}/meta-connected?status=error&message=${encodeURIComponent(message)}`,
      );
      return;
    }

    try {
      const result = await this.socialConnectionsService.completeMetaOauth(
        query.code,
        query.state,
      );
      response.redirect(
        `${frontendUrl}/meta-connected?status=success&pages=${result.pageCount}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Meta connection failed.';
      response.redirect(
        `${frontendUrl}/meta-connected?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  }
}
