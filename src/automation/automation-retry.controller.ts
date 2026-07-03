import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { AutomationRetryService, RetryResult } from './automation-retry.service';

@ApiTags('automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('automation')
export class AutomationRetryController {
  constructor(private readonly automationRetryService: AutomationRetryService) {}

  @Post('logs/:id/retry')
  @ApiOperation({ summary: 'Re-run the side effect behind a failed automation log' })
  @ApiOkResponse({ description: 'Automation retried.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can retry automations.' })
  @ApiNotFoundResponse({ description: 'Automation log not found.' })
  @ApiBadRequestResponse({ description: 'Log is not failed or is not retryable.' })
  retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RetryResult> {
    return this.automationRetryService.retry(id, user.organizationId);
  }
}
