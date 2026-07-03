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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ContentTemplatesService } from './content-templates.service';
import { ContentTemplateResponseDto } from './dto/content-template-response.dto';
import { CreateContentTemplateDto } from './dto/create-content-template.dto';
import { UpdateContentTemplateDto } from './dto/update-content-template.dto';

@ApiTags('content-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('content-templates')
export class ContentTemplatesController {
  constructor(private readonly contentTemplatesService: ContentTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reusable content template' })
  @ApiCreatedResponse({
    description: 'Content template created.',
    type: ContentTemplateResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({
    description: 'Only admins and team members can manage content templates.',
  })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  create(
    @Body() input: CreateContentTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentTemplateResponseDto> {
    return this.contentTemplatesService.create(input, user.organizationId);
  }

  @Get()
  @ApiOperation({
    summary: "List content templates (shared + a client's own when clientId is given)",
  })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiOkResponse({
    description: 'Content templates.',
    type: ContentTemplateResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view content templates.' })
  findAvailable(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clientId') clientId?: string,
  ): Promise<ContentTemplateResponseDto[]> {
    return this.contentTemplatesService.findAvailable(user.organizationId, clientId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a content template' })
  @ApiOkResponse({ description: 'Content template updated.', type: ContentTemplateResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({
    description: 'Only admins and team members can manage content templates.',
  })
  @ApiNotFoundResponse({ description: 'Content template or client not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateContentTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentTemplateResponseDto> {
    return this.contentTemplatesService.update(id, input, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content template' })
  @ApiOkResponse({ description: 'Content template deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({
    description: 'Only admins and team members can manage content templates.',
  })
  @ApiNotFoundResponse({ description: 'Content template not found.' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: true; id: string }> {
    return this.contentTemplatesService.remove(id, user.organizationId);
  }
}
