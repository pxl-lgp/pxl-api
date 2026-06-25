import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { OnboardingTaskResponseDto } from './dto/onboarding-task-response.dto';
import { UpdateOnboardingTaskDto } from './dto/update-onboarding-task.dto';
import { OnboardingTasksService } from './onboarding-tasks.service';

@ApiTags('onboarding-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('onboarding-tasks')
export class OnboardingTasksController {
  constructor(private readonly onboardingTasksService: OnboardingTasksService) {}

  @Get()
  @ApiOperation({ summary: 'List the onboarding checklist for a client' })
  @ApiQuery({ name: 'clientId', required: true })
  @ApiOkResponse({
    description: 'Onboarding tasks.',
    type: OnboardingTaskResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view onboarding tasks.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  async findForClient(
    @Query('clientId', ParseUUIDPipe) clientId: string,
  ): Promise<OnboardingTaskResponseDto[]> {
    await this.onboardingTasksService.ensureClientExists(clientId);
    return this.onboardingTasksService.findForClient(clientId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an onboarding task status or details' })
  @ApiOkResponse({ description: 'Onboarding task updated.', type: OnboardingTaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({
    description: 'Only admins and team members can update onboarding tasks.',
  })
  @ApiNotFoundResponse({ description: 'Onboarding task not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateOnboardingTaskDto,
  ): Promise<OnboardingTaskResponseDto> {
    return this.onboardingTasksService.update(id, input);
  }
}
