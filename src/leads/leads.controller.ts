import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a public lead inquiry' })
  @ApiCreatedResponse({ description: 'Lead submitted.', type: LeadResponseDto })
  create(@Body() input: CreateLeadDto): Promise<LeadResponseDto> {
    return this.leadsService.create(input);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEAM')
  @ApiOperation({ summary: 'List leads' })
  @ApiOkResponse({ description: 'Lead list.', type: LeadResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list leads.' })
  findAll(): Promise<LeadResponseDto[]> {
    return this.leadsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEAM')
  @ApiOperation({ summary: 'Get lead by id' })
  @ApiOkResponse({ description: 'Lead record.', type: LeadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view leads.' })
  @ApiNotFoundResponse({ description: 'Lead not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LeadResponseDto> {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEAM')
  @ApiOperation({ summary: 'Update lead details or status' })
  @ApiOkResponse({ description: 'Lead updated.', type: LeadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can update leads.' })
  @ApiNotFoundResponse({ description: 'Lead or client not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    return this.leadsService.update(id, input);
  }

  @Post(':id/convert')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEAM')
  @ApiOperation({ summary: 'Convert a qualified lead into a client' })
  @ApiOkResponse({ description: 'Lead converted to client.', type: LeadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can convert leads.' })
  @ApiNotFoundResponse({ description: 'Lead not found.' })
  @ApiBadRequestResponse({ description: 'Lead is already linked to a client.' })
  convert(@Param('id', ParseUUIDPipe) id: string): Promise<LeadResponseDto> {
    return this.leadsService.convertToClient(id);
  }
}
