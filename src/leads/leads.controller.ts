import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Feature } from '../feature-access/feature.decorator';
import { FeatureAccessGuard } from '../feature-access/feature-access.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Submit a public lead inquiry' })
  @ApiCreatedResponse({ description: 'Lead submitted.', type: LeadResponseDto })
  create(@Body() input: CreateLeadDto): Promise<LeadResponseDto> {
    return this.leadsService.create(input);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles('ADMIN', 'TEAM')
  @Feature('leads')
  @ApiOperation({ summary: 'List leads' })
  @ApiOkResponse({ description: 'Lead list.', type: LeadResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list leads.' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<LeadResponseDto[]> {
    return this.leadsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles('ADMIN', 'TEAM')
  @Feature('leads')
  @ApiOperation({ summary: 'Get lead by id' })
  @ApiOkResponse({ description: 'Lead record.', type: LeadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view leads.' })
  @ApiNotFoundResponse({ description: 'Lead not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LeadResponseDto> {
    return this.leadsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles('ADMIN', 'TEAM')
  @Feature('leads')
  @ApiOperation({ summary: 'Update lead details or status' })
  @ApiOkResponse({ description: 'Lead updated.', type: LeadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can update leads.' })
  @ApiNotFoundResponse({ description: 'Lead or client not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LeadResponseDto> {
    return this.leadsService.update(id, input, user.organizationId);
  }

  @Post(':id/convert')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles('ADMIN', 'TEAM')
  @Feature('leads')
  @ApiOperation({ summary: 'Convert a qualified lead into a client' })
  @ApiOkResponse({ description: 'Lead converted to client.', type: LeadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can convert leads.' })
  @ApiNotFoundResponse({ description: 'Lead not found.' })
  @ApiBadRequestResponse({ description: 'Lead is already linked to a client.' })
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LeadResponseDto> {
    return this.leadsService.convertToClient(id, user.organizationId);
  }
}
