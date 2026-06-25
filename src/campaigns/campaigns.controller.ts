import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Feature } from '../feature-access/feature.decorator';
import { FeatureAccessGuard } from '../feature-access/feature-access.guard';
import { CampaignsService } from './campaigns.service';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Roles('ADMIN', 'TEAM')
@Feature('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a campaign' })
  @ApiCreatedResponse({ description: 'Campaign created.', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage campaigns.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  create(
    @Body() input: CreateCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.create(input, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns' })
  @ApiOkResponse({ description: 'Campaigns.', type: CampaignResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view campaigns.' })
  findAll(
    @Query() query: CampaignQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CampaignResponseDto[]> {
    return this.campaignsService.findAll(query, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by id' })
  @ApiOkResponse({ description: 'Campaign.', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view campaigns.' })
  @ApiNotFoundResponse({ description: 'Campaign not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiOkResponse({ description: 'Campaign updated.', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage campaigns.' })
  @ApiNotFoundResponse({ description: 'Campaign or client not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.update(id, input, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  @ApiOkResponse({ description: 'Campaign deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage campaigns.' })
  @ApiNotFoundResponse({ description: 'Campaign not found.' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: true; id: string }> {
    return this.campaignsService.remove(id, user.organizationId);
  }
}
