import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Feature } from '../feature-access/feature.decorator';
import { FeatureAccessGuard } from '../feature-access/feature-access.guard';
import { OperationsService } from './operations.service';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Roles('ADMIN', 'TEAM')
@Feature('operations')
@Controller()
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('exports/:entity')
  @Header('Content-Type', 'text/csv')
  exportCsv(
    @Param('entity') entity: 'clients' | 'leads' | 'content' | 'analytics' | 'audit' | 'billing',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operationsService.exportCsv(entity, user.organizationId);
  }

  @Post('imports/clients')
  @Roles('ADMIN')
  importClients(
    @Body() input: { rows: Array<Record<string, string>> },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operationsService.importClients(input.rows ?? [], user.organizationId);
  }

  @Post('imports/leads')
  @Roles('ADMIN')
  importLeads(
    @Body() input: { rows: Array<Record<string, string>> },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operationsService.importLeads(input.rows ?? [], user.organizationId);
  }

  @Get('client-health')
  getClientHealth(@CurrentUser() user: AuthenticatedUser) {
    return this.operationsService.getClientHealth(user.organizationId);
  }

  @Get('search')
  search(@Query('q') q = '', @CurrentUser() user: AuthenticatedUser) {
    return this.operationsService.search(q, user.organizationId);
  }
}
