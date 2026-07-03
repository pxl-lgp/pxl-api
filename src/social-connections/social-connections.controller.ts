import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { MetaOauthUrlResponseDto } from './dto/meta-oauth-url-response.dto';
import { SocialConnectionResponseDto } from './dto/social-connection-response.dto';
import { SocialConnectionsService } from './social-connections.service';

@ApiTags('social-connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('clients/:clientId/social-connections')
export class SocialConnectionsController {
  constructor(private readonly socialConnectionsService: SocialConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List every social Page connected to a client' })
  @ApiOkResponse({ type: SocialConnectionResponseDto, isArray: true })
  list(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.socialConnectionsService.list(clientId, user.organizationId);
  }

  @Post('meta/oauth-url')
  @ApiOperation({ summary: 'Create a one-time Meta owner authorization URL' })
  @ApiOkResponse({ type: MetaOauthUrlResponseDto })
  createMetaOauthUrl(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.socialConnectionsService.createMetaOauthUrl(clientId, user);
  }

  @Post('meta-authorizations/:authorizationId/sync')
  @ApiOperation({ summary: 'Refresh Pages for an existing Meta authorization' })
  @ApiOkResponse({ type: SocialConnectionResponseDto, isArray: true })
  syncAuthorization(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('authorizationId', ParseUUIDPipe) authorizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.socialConnectionsService.syncAuthorization(clientId, authorizationId, user.organizationId);
  }

  @Delete(':connectionId')
  @ApiOperation({ summary: 'Disconnect one Page from a client' })
  @ApiOkResponse({ type: SocialConnectionResponseDto })
  disconnect(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.socialConnectionsService.disconnect(clientId, connectionId, user.organizationId);
  }
}
