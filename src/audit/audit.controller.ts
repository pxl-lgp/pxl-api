import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries' })
  @ApiOkResponse({ type: AuditLogResponseDto, isArray: true })
  findAll(
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.findAll({ action, entityType });
  }
}
