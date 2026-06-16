import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BestTimeResult } from './best-time';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an analytics record for a content item' })
  @ApiCreatedResponse({ description: 'Analytics record created.', type: AnalyticsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can create analytics records.' })
  @ApiNotFoundResponse({ description: 'Content item not found.' })
  create(@Body() input: CreateAnalyticsDto): Promise<AnalyticsResponseDto> {
    return this.analyticsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List analytics records' })
  @ApiOkResponse({ description: 'Analytics records.', type: AnalyticsResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list analytics records.' })
  findAll(): Promise<AnalyticsResponseDto[]> {
    return this.analyticsService.findAll();
  }

  @Get('best-times')
  @ApiOperation({ summary: 'Best-time-to-post suggestions from published engagement history' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiOkResponse({ description: 'Best-time suggestions.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view best-time insights.' })
  getBestTimes(@Query('clientId') clientId?: string): Promise<BestTimeResult> {
    return this.analyticsService.getBestTimes(clientId);
  }

  @Get('content/:contentItemId')
  @ApiOperation({ summary: 'List analytics records for one content item' })
  @ApiOkResponse({ description: 'Analytics records for the content item.', type: AnalyticsResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view analytics records.' })
  @ApiNotFoundResponse({ description: 'Content item not found.' })
  findForContent(
    @Param('contentItemId', ParseUUIDPipe) contentItemId: string,
  ): Promise<AnalyticsResponseDto[]> {
    return this.analyticsService.findForContent(contentItemId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get analytics record by id' })
  @ApiOkResponse({ description: 'Analytics record.', type: AnalyticsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view analytics records.' })
  @ApiNotFoundResponse({ description: 'Analytics record not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AnalyticsResponseDto> {
    return this.analyticsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update analytics metrics' })
  @ApiOkResponse({ description: 'Analytics record updated.', type: AnalyticsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can update analytics records.' })
  @ApiNotFoundResponse({ description: 'Analytics record or content item not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAnalyticsDto,
  ): Promise<AnalyticsResponseDto> {
    return this.analyticsService.update(id, input);
  }
}
