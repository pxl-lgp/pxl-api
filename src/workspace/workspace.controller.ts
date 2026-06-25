import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Feature } from '../feature-access/feature.decorator';
import { FeatureAccessGuard } from '../feature-access/feature-access.guard';
import {
  CreateWorkspaceBoardDto,
  CreateWorkspaceChannelDto,
  CreateWorkspaceMessageDto,
  CreateWorkspacePageDto,
  CreateWorkspaceTaskCommentDto,
  CreateWorkspaceTaskDto,
  UpdateWorkspaceChannelDto,
  UpdateWorkspacePageDto,
  UpdateWorkspaceTaskDto,
} from './dto/workspace.dto';
import { WorkspaceService } from './workspace.service';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Roles('ADMIN', 'TEAM')
@Feature('workspace')
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get('channels')
  listChannels(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.listChannels(user);
  }

  @Post('channels')
  createChannel(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateWorkspaceChannelDto) {
    return this.workspaceService.createChannel(user, input);
  }

  @Patch('channels/:id')
  updateChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateWorkspaceChannelDto,
  ) {
    return this.workspaceService.updateChannel(user, id, input);
  }

  @Delete('channels/:id')
  deleteChannel(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workspaceService.deleteChannel(user, id);
  }

  @Get('channels/:id/messages')
  listMessages(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workspaceService.listMessages(user, id);
  }

  @Post('channels/:id/messages')
  createMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateWorkspaceMessageDto,
  ) {
    return this.workspaceService.createMessage(user, id, input);
  }

  @Get('boards')
  listBoards(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.listBoards(user);
  }

  @Post('boards')
  createBoard(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateWorkspaceBoardDto) {
    return this.workspaceService.createBoard(user, input);
  }

  @Get('tasks')
  listTasks(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.listTasks(user);
  }

  @Post('tasks')
  createTask(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateWorkspaceTaskDto) {
    return this.workspaceService.createTask(user, input);
  }

  @Patch('tasks/:id')
  updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateWorkspaceTaskDto,
  ) {
    return this.workspaceService.updateTask(user, id, input);
  }

  @Get('tasks/:id/comments')
  listTaskComments(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workspaceService.listTaskComments(user, id);
  }

  @Post('tasks/:id/comments')
  createTaskComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateWorkspaceTaskCommentDto,
  ) {
    return this.workspaceService.createTaskComment(user, id, input);
  }

  @Get('pages')
  listPages(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.listPages(user);
  }

  @Post('pages')
  createPage(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateWorkspacePageDto) {
    return this.workspaceService.createPage(user, input);
  }

  @Patch('pages/:id')
  updatePage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateWorkspacePageDto,
  ) {
    return this.workspaceService.updatePage(user, id, input);
  }
}
