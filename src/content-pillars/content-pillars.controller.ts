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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContentPillarsService } from './content-pillars.service';
import { ContentPillarResponseDto } from './dto/content-pillar-response.dto';
import { CreateContentPillarDto } from './dto/create-content-pillar.dto';
import { UpdateContentPillarDto } from './dto/update-content-pillar.dto';

@ApiTags('content-pillars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('content-pillars')
export class ContentPillarsController {
  constructor(private readonly contentPillarsService: ContentPillarsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a content pillar for a client' })
  @ApiCreatedResponse({ description: 'Content pillar created.', type: ContentPillarResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage content pillars.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  create(@Body() input: CreateContentPillarDto): Promise<ContentPillarResponseDto> {
    return this.contentPillarsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List content pillars for a client' })
  @ApiQuery({ name: 'clientId', required: true })
  @ApiOkResponse({ description: 'Content pillars.', type: ContentPillarResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view content pillars.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  findForClient(
    @Query('clientId', ParseUUIDPipe) clientId: string,
  ): Promise<ContentPillarResponseDto[]> {
    return this.contentPillarsService.findForClient(clientId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a content pillar' })
  @ApiOkResponse({ description: 'Content pillar updated.', type: ContentPillarResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage content pillars.' })
  @ApiNotFoundResponse({ description: 'Content pillar or client not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateContentPillarDto,
  ): Promise<ContentPillarResponseDto> {
    return this.contentPillarsService.update(id, input);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content pillar' })
  @ApiOkResponse({ description: 'Content pillar deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can manage content pillars.' })
  @ApiNotFoundResponse({ description: 'Content pillar not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: true; id: string }> {
    return this.contentPillarsService.remove(id);
  }
}
