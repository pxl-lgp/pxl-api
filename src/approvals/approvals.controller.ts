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
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ApprovalCommentResponseDto } from './dto/approval-comment-response.dto';
import { ApprovalResponseDto } from './dto/approval-response.dto';
import { CreateApprovalCommentDto } from './dto/create-approval-comment.dto';
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
  create(
    @Body() input: CreateApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.create(input, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List approvals' })
  @ApiOkResponse({ description: 'Approval list.', type: ApprovalResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list approvals.' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<ApprovalResponseDto[]> {
    return this.approvalsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval by id' })
  @ApiOkResponse({ description: 'Approval record.', type: ApprovalResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view approvals.' })
  @ApiNotFoundResponse({ description: 'Approval not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.findOne(id, user.organizationId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List comments on an approval' })
  @ApiOkResponse({
    description: 'Approval comments.',
    type: ApprovalCommentResponseDto,
    isArray: true,
  })
  findComments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApprovalCommentResponseDto[]> {
    return this.approvalsService.findComments(id, user.organizationId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a team comment to an approval' })
  @ApiCreatedResponse({
    description: 'Approval comment created.',
    type: ApprovalCommentResponseDto,
  })
  createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateApprovalCommentDto,
  ): Promise<ApprovalCommentResponseDto> {
    return this.approvalsService.createComment(id, user, input);
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.update(id, input, user.organizationId);
  }
}
