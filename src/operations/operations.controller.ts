import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OperationsService } from './operations.service';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller()
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('exports/:entity')
  @Header('Content-Type', 'text/csv')
  exportCsv(@Param('entity') entity: 'clients' | 'leads' | 'content' | 'analytics' | 'audit' | 'billing') {
    return this.operationsService.exportCsv(entity);
  }

  @Post('imports/clients')
  @Roles('ADMIN')
  importClients(@Body() input: { rows: Array<Record<string, string>> }) {
    return this.operationsService.importClients(input.rows ?? []);
  }

  @Post('imports/leads')
  @Roles('ADMIN')
  importLeads(@Body() input: { rows: Array<Record<string, string>> }) {
    return this.operationsService.importLeads(input.rows ?? []);
  }

  @Get('client-health')
  getClientHealth() {
    return this.operationsService.getClientHealth();
  }

  @Get('search')
  search(@Query('q') q = '') {
    return this.operationsService.search(q);
  }
}
