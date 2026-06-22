import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AutomationService } from './automation.service';
import { AutomationLogResponseDto } from './dto/automation-log-response.dto';

@ApiTags('automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('logs')
  @ApiOperation({ summary: 'List automation logs, optionally filtered by status' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'SENT', 'SUCCEEDED', 'FAILED'] })
  @ApiOkResponse({ description: 'Automation logs.', type: AutomationLogResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view automation logs.' })
  findAll(
    @Query('status') status?: 'PENDING' | 'SENT' | 'SUCCEEDED' | 'FAILED',
  ): Promise<AutomationLogResponseDto[]> {
    return this.automationService.findAll(status);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get automation health summary' })
  @ApiOkResponse({ description: 'Automation summary.' })
  getSummary() {
    return this.automationService.getSummary();
  }
}
