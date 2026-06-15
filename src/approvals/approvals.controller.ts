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
import { ApprovalResponseDto } from './dto/approval-response.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';
import { ApprovalsService } from './approvals.service';

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @ApiOperation({ summary: 'Send a content item for approval' })
  @ApiCreatedResponse({ description: 'Approval created.', type: ApprovalResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can create approvals.' })
  @ApiNotFoundResponse({ description: 'Content item not found.' })
  create(@Body() input: CreateApprovalDto): Promise<ApprovalResponseDto> {
    return this.approvalsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List approvals' })
  @ApiOkResponse({ description: 'Approval list.', type: ApprovalResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list approvals.' })
  findAll(): Promise<ApprovalResponseDto[]> {
    return this.approvalsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval by id' })
  @ApiOkResponse({ description: 'Approval record.', type: ApprovalResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view approvals.' })
  @ApiNotFoundResponse({ description: 'Approval not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApprovalResponseDto> {
    return this.approvalsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Approve content or request revision' })
  @ApiOkResponse({ description: 'Approval updated.', type: ApprovalResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can update approvals.' })
  @ApiNotFoundResponse({ description: 'Approval not found.' })
  @ApiBadRequestResponse({ description: 'Invalid approval decision.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateApprovalDto,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.update(id, input);
  }
}
