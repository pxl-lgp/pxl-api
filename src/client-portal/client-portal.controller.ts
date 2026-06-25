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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpdateApprovalDto } from '../approvals/dto/update-approval.dto';
import { ApprovalCommentResponseDto } from '../approvals/dto/approval-comment-response.dto';
import { ApprovalResponseDto } from '../approvals/dto/approval-response.dto';
import { CreateApprovalCommentDto } from '../approvals/dto/create-approval-comment.dto';
import { AssetResponseDto } from '../assets/dto/asset-response.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ClientResponseDto } from '../clients/dto/client-response.dto';
import { ContentItemResponseDto } from '../content/dto/content-item-response.dto';
import { ReportResponseDto } from '../reports/dto/report-response.dto';
import { ClientPortalService } from './client-portal.service';

@ApiTags('client portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
@Controller('client-portal')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get the current client portal overview' })
  @ApiOkResponse({ description: 'Client workspace overview.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only client users can access the client portal.' })
  @ApiNotFoundResponse({ description: 'No client workspace is linked to this user email.' })
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortalService.getOverview(user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the client workspace linked to the current user' })
  @ApiOkResponse({ description: 'Linked client workspace.', type: ClientResponseDto })
  getClient(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortalService.getClientForUser(user);
  }

  @Get('content')
  @ApiOperation({ summary: 'List content visible to the current client' })
  @ApiOkResponse({
    description: 'Client content items.',
    type: ContentItemResponseDto,
    isArray: true,
  })
  getContent(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortalService.getContentForUser(user);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'List approvals visible to the current client' })
  @ApiOkResponse({ description: 'Client approvals.', type: ApprovalResponseDto, isArray: true })
  getApprovals(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortalService.getApprovalsForUser(user);
  }

  @Patch('approvals/:id')
  @ApiOperation({ summary: 'Approve content or request revision as the current client' })
  @ApiOkResponse({ description: 'Approval decision saved.', type: ApprovalResponseDto })
  @ApiNotFoundResponse({ description: 'Approval not found for this client.' })
  decideApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateApprovalDto,
  ) {
    return this.clientPortalService.decideApproval(user, id, input);
  }

  @Get('approvals/:id/comments')
  @ApiOperation({ summary: 'List comments for a client-visible approval' })
  @ApiOkResponse({
    description: 'Approval comments.',
    type: ApprovalCommentResponseDto,
    isArray: true,
  })
  getApprovalComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientPortalService.getApprovalComments(user, id);
  }

  @Post('approvals/:id/comments')
  @ApiOperation({ summary: 'Add a client comment to an approval' })
  @ApiOkResponse({ description: 'Approval comment created.', type: ApprovalCommentResponseDto })
  createApprovalComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateApprovalCommentDto,
  ) {
    return this.clientPortalService.createApprovalComment(user, id, input);
  }

  @Get('assets')
  @ApiOperation({ summary: 'List assets visible to the current client' })
  @ApiOkResponse({ description: 'Client assets.', type: AssetResponseDto, isArray: true })
  getAssets(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortalService.getAssetsForUser(user);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List reports visible to the current client' })
  @ApiOkResponse({ description: 'Client reports.', type: ReportResponseDto, isArray: true })
  getReports(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortalService.getReportsForUser(user);
  }
}
