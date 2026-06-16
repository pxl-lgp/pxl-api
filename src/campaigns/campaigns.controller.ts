import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CampaignsService } from './campaigns.service';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a campaign' })
  @ApiCreatedResponse({ description: 'Campaign created.', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage campaigns.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  create(@Body() input: CreateCampaignDto): Promise<CampaignResponseDto> {
    return this.campaignsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns' })
  @ApiOkResponse({ description: 'Campaigns.', type: CampaignResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view campaigns.' })
  findAll(@Query() query: CampaignQueryDto): Promise<CampaignResponseDto[]> {
    return this.campaignsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by id' })
  @ApiOkResponse({ description: 'Campaign.', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view campaigns.' })
  @ApiNotFoundResponse({ description: 'Campaign not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CampaignResponseDto> {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiOkResponse({ description: 'Campaign updated.', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage campaigns.' })
  @ApiNotFoundResponse({ description: 'Campaign or client not found.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateCampaignDto): Promise<CampaignResponseDto> {
    return this.campaignsService.update(id, input);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  @ApiOkResponse({ description: 'Campaign deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage campaigns.' })
  @ApiNotFoundResponse({ description: 'Campaign not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: true; id: string }> {
    return this.campaignsService.remove(id);
  }
}
