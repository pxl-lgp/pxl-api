import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { ContentService } from './content.service';
import { ContentItemResponseDto } from './dto/content-item-response.dto';
import { ContentQueryDto } from './dto/content-query.dto';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { ScheduleContentDto } from './dto/schedule-content.dto';
import { UpdateContentItemDto } from './dto/update-content-item.dto';

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a content item' })
  @ApiCreatedResponse({ description: 'Content item created.', type: ContentItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can create content.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  create(@Body() input: CreateContentItemDto): Promise<ContentItemResponseDto> {
    return this.contentService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List content items, optionally filtered by client, status, type, or title search' })
  @ApiOkResponse({ description: 'Content items.', type: ContentItemResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list content.' })
  findAll(@Query() query: ContentQueryDto): Promise<ContentItemResponseDto[]> {
    return this.contentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a content item by id' })
  @ApiOkResponse({ description: 'Content item.', type: ContentItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view content.' })
  @ApiNotFoundResponse({ description: 'Content item not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ContentItemResponseDto> {
    return this.contentService.findOne(id);
  }

  @Patch(':id/schedule')
  @ApiOperation({ summary: 'Schedule a content item for publishing' })
  @ApiOkResponse({ description: 'Content item scheduled.', type: ContentItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can schedule content.' })
  @ApiNotFoundResponse({ description: 'Content item not found.' })
  schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ScheduleContentDto,
  ): Promise<ContentItemResponseDto> {
    return this.contentService.schedule(id, input);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish a content item to its selected social platforms' })
  @ApiOkResponse({ description: 'Content item published to all selected platforms.', type: ContentItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can publish content.' })
  @ApiNotFoundResponse({ description: 'Content item not found.' })
  publish(@Param('id', ParseUUIDPipe) id: string): Promise<ContentItemResponseDto> {
    return this.contentService.publish(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a content item' })
  @ApiOkResponse({ description: 'Content item updated.', type: ContentItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can update content.' })
  @ApiNotFoundResponse({ description: 'Content item or client not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateContentItemDto,
  ): Promise<ContentItemResponseDto> {
    return this.contentService.update(id, input);
  }
}
