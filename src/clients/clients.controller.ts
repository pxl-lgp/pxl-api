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
import { ClientsService } from './clients.service';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Roles('ADMIN', 'TEAM')
@Feature('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a client onboarding record' })
  @ApiCreatedResponse({
    description: 'Client created and client-created automation event logged.',
    type: ClientResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can create clients.' })
  create(
    @Body() input: CreateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientResponseDto> {
    return this.clientsService.create(input, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List clients' })
  @ApiOkResponse({ description: 'Client list.', type: ClientResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list clients.' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<ClientResponseDto[]> {
    return this.clientsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client by id' })
  @ApiOkResponse({ description: 'Client record.', type: ClientResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view this client.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientResponseDto> {
    return this.clientsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client onboarding record' })
  @ApiOkResponse({ description: 'Client updated.', type: ClientResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can update clients.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientResponseDto> {
    return this.clientsService.update(id, input, user.organizationId);
  }
}
