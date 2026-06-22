import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const permissions = [
  { key: 'users.manage', label: 'Manage users', roles: ['ADMIN'] },
  { key: 'settings.manage', label: 'Manage settings', roles: ['ADMIN'] },
  { key: 'audit.view', label: 'View audit logs', roles: ['ADMIN'] },
  { key: 'clients.manage', label: 'Manage clients', roles: ['ADMIN', 'TEAM'] },
  { key: 'content.manage', label: 'Manage content', roles: ['ADMIN', 'TEAM'] },
  { key: 'approvals.manage', label: 'Manage approvals', roles: ['ADMIN', 'TEAM'] },
  { key: 'automation.view', label: 'View automation logs', roles: ['ADMIN', 'TEAM'] },
  { key: 'client.portal', label: 'Use client portal', roles: ['CLIENT'] },
];

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('permissions')
export class PermissionsController {
  @Get()
  @ApiOperation({ summary: 'List role permissions' })
  @ApiOkResponse({ description: 'Role permission matrix.' })
  findAll() {
    return permissions;
  }
}
