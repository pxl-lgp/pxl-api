import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, or } from 'drizzle-orm';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import {
  clients,
  users,
  workspaceBoards,
  workspaceChannelMembers,
  workspaceChannels,
  workspaceMessages,
  workspacePages,
  workspaceTaskComments,
  workspaceTasks,
} from '../database/schema';
import {
  CreateWorkspaceBoardDto,
  CreateWorkspaceChannelDto,
  CreateWorkspaceMessageDto,
  CreateWorkspacePageDto,
  CreateWorkspaceTaskCommentDto,
  CreateWorkspaceTaskDto,
  UpdateWorkspaceBoardDto,
  UpdateWorkspaceChannelDto,
  UpdateWorkspacePageDto,
  UpdateWorkspaceTaskDto,
} from './dto/workspace.dto';

type ChannelRecord = typeof workspaceChannels.$inferSelect;

@Injectable()
export class WorkspaceService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async ensureDefaultsForOrganization(organizationId: string): Promise<void> {
    const general = await this.ensureChannelDefault({
      organizationId,
      name: 'general',
      slug: 'general',
      description: 'Default team discussion channel.',
      type: 'GENERAL',
    });
    const activity = await this.ensureChannelDefault({
      organizationId,
      name: 'activity',
      slug: 'activity',
      description: 'System activity and operational updates.',
      type: 'SYSTEM',
    });

    await this.ensureBoardDefault({
      organizationId,
      name: 'Team Tasks',
      slug: 'team-tasks',
      description: 'Default board for internal tasks.',
    });
    await this.ensurePageDefault({
      organizationId,
      title: 'Team Notes',
      slug: 'team-notes',
      text: '# Team Notes\n\nUse this page for shared notes, SOPs, and working agreements.',
    });
    await this.ensureSystemMessage(general.id, organizationId, 'Welcome to your team workspace.');
    await this.ensureSystemMessage(
      activity.id,
      organizationId,
      'Workspace activity will appear here.',
    );
  }

  async postActivity(input: {
    organizationId: string;
    body: string;
    event: string;
    href?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const activity = await this.ensureChannelDefault({
      organizationId: input.organizationId,
      name: 'activity',
      slug: 'activity',
      description: 'System activity and operational updates.',
      type: 'SYSTEM',
    });

    await this.db.insert(workspaceMessages).values({
      organizationId: input.organizationId,
      channelId: activity.id,
      body: input.body,
      metadata: {
        system: true,
        event: input.event,
        href: input.href,
        ...input.metadata,
      },
    });
  }

  async listChannels(user: AuthenticatedUser) {
    await this.ensureDefaultsForOrganization(user.organizationId);

    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return this.db
        .select()
        .from(workspaceChannels)
        .where(eq(workspaceChannels.organizationId, user.organizationId))
        .orderBy(asc(workspaceChannels.name));
    }

    const rows = await this.db
      .select({ channel: workspaceChannels })
      .from(workspaceChannels)
      .leftJoin(
        workspaceChannelMembers,
        and(
          eq(workspaceChannelMembers.channelId, workspaceChannels.id),
          eq(workspaceChannelMembers.userId, user.id),
        ),
      )
      .where(
        and(
          eq(workspaceChannels.organizationId, user.organizationId),
          or(
            eq(workspaceChannels.visibility, 'PUBLIC'),
            eq(workspaceChannelMembers.userId, user.id),
          ),
        ),
      )
      .orderBy(asc(workspaceChannels.name));

    return rows.map((row) => row.channel);
  }

  async createChannel(user: AuthenticatedUser, input: CreateWorkspaceChannelDto) {
    await this.ensureClient(input.clientId, user.organizationId);
    const [channel] = await this.db
      .insert(workspaceChannels)
      .values({
        organizationId: user.organizationId,
        clientId: input.clientId,
        name: input.name.trim(),
        slug: await this.uniqueSlug('channel', user.organizationId, input.name),
        description: input.description,
        type: input.type ?? (input.clientId ? 'CLIENT' : 'GENERAL'),
        visibility: input.visibility ?? 'PUBLIC',
        createdByUserId: user.id,
      })
      .returning();

    await this.db
      .insert(workspaceChannelMembers)
      .values({ channelId: channel.id, userId: user.id, role: 'OWNER' });
    return channel;
  }

  async updateChannel(user: AuthenticatedUser, id: string, input: UpdateWorkspaceChannelDto) {
    await this.requireChannelAccess(user, id, true);
    const [channel] = await this.db
      .update(workspaceChannels)
      .set({ ...input, name: input.name?.trim(), updatedAt: new Date() })
      .where(
        and(
          eq(workspaceChannels.id, id),
          eq(workspaceChannels.organizationId, user.organizationId),
        ),
      )
      .returning();
    return channel;
  }

  async deleteChannel(user: AuthenticatedUser, id: string) {
    const channel = await this.requireChannelAccess(user, id, true);
    if (channel.type === 'SYSTEM')
      throw new ForbiddenException('System channels cannot be deleted.');
    await this.db.delete(workspaceChannels).where(eq(workspaceChannels.id, id));
    return { deleted: true, id };
  }

  async listMessages(user: AuthenticatedUser, channelId: string) {
    await this.requireChannelAccess(user, channelId);
    const rows = await this.db
      .select({ message: workspaceMessages, authorName: users.name, authorRole: users.role })
      .from(workspaceMessages)
      .leftJoin(users, eq(workspaceMessages.authorUserId, users.id))
      .where(
        and(
          eq(workspaceMessages.channelId, channelId),
          eq(workspaceMessages.organizationId, user.organizationId),
        ),
      )
      .orderBy(asc(workspaceMessages.createdAt));
    return rows.map((row) => ({
      ...row.message,
      authorName: row.authorName,
      authorRole: row.authorRole,
    }));
  }

  async createMessage(
    user: AuthenticatedUser,
    channelId: string,
    input: CreateWorkspaceMessageDto,
  ) {
    await this.requireChannelAccess(user, channelId);
    const [message] = await this.db
      .insert(workspaceMessages)
      .values({
        organizationId: user.organizationId,
        channelId,
        authorUserId: user.id,
        body: input.body.trim(),
        metadata: {},
      })
      .returning();
    return { ...message, authorName: user.name, authorRole: user.role };
  }

  async deleteMessage(user: AuthenticatedUser, id: string) {
    const [message] = await this.db
      .select()
      .from(workspaceMessages)
      .where(and(eq(workspaceMessages.id, id), eq(workspaceMessages.organizationId, user.organizationId)))
      .limit(1);
    if (!message) throw new NotFoundException('Message not found.');

    await this.requireChannelAccess(user, message.channelId, true);
    await this.db.delete(workspaceMessages).where(eq(workspaceMessages.id, id));
    return { deleted: true, id };
  }

  async listBoards(user: AuthenticatedUser) {
    await this.ensureBoardDefault({
      organizationId: user.organizationId,
      name: 'Team Tasks',
      slug: 'team-tasks',
      description: 'Default board for internal tasks.',
    });

    return this.db
      .select()
      .from(workspaceBoards)
      .where(eq(workspaceBoards.organizationId, user.organizationId))
      .orderBy(asc(workspaceBoards.name));
  }

  async createBoard(user: AuthenticatedUser, input: CreateWorkspaceBoardDto) {
    await this.ensureClient(input.clientId, user.organizationId);
    const [board] = await this.db
      .insert(workspaceBoards)
      .values({
        organizationId: user.organizationId,
        clientId: input.clientId,
        name: input.name.trim(),
        slug: await this.uniqueSlug('board', user.organizationId, input.name),
        description: input.description,
        createdByUserId: user.id,
      })
      .returning();
    return board;
  }

  async updateBoard(user: AuthenticatedUser, id: string, input: UpdateWorkspaceBoardDto) {
    await this.requireBoard(user, id);
    const [board] = await this.db
      .update(workspaceBoards)
      .set({ ...input, name: input.name?.trim(), updatedAt: new Date() })
      .where(and(eq(workspaceBoards.id, id), eq(workspaceBoards.organizationId, user.organizationId)))
      .returning();
    return board;
  }

  async deleteBoard(user: AuthenticatedUser, id: string) {
    await this.requireBoard(user, id);
    await this.db
      .delete(workspaceBoards)
      .where(and(eq(workspaceBoards.id, id), eq(workspaceBoards.organizationId, user.organizationId)));
    return { deleted: true, id };
  }

  async listTasks(user: AuthenticatedUser) {
    return this.db
      .select()
      .from(workspaceTasks)
      .where(eq(workspaceTasks.organizationId, user.organizationId))
      .orderBy(desc(workspaceTasks.createdAt));
  }

  async createTask(user: AuthenticatedUser, input: CreateWorkspaceTaskDto) {
    await this.ensureBoard(input.boardId, user.organizationId);
    await this.ensureClient(input.clientId, user.organizationId);
    const [task] = await this.db
      .insert(workspaceTasks)
      .values({
        organizationId: user.organizationId,
        boardId: input.boardId,
        clientId: input.clientId,
        title: input.title.trim(),
        description: input.description,
        status: input.status ?? 'TODO',
        priority: input.priority ?? 'MEDIUM',
        assigneeUserId: input.assigneeUserId,
        reporterUserId: user.id,
      })
      .returning();
    return task;
  }

  async updateTask(user: AuthenticatedUser, id: string, input: UpdateWorkspaceTaskDto) {
    const existingTask = await this.requireTask(user, id);
    const [task] = await this.db
      .update(workspaceTasks)
      .set({ ...input, title: input.title?.trim(), updatedAt: new Date() })
      .where(and(eq(workspaceTasks.id, id), eq(workspaceTasks.organizationId, user.organizationId)))
      .returning();
    if (input.status === 'DONE' && existingTask.status !== 'DONE') {
      void this.postActivity({
        organizationId: user.organizationId,
        event: 'task-completed',
        body: `Task completed: ${task.title}`,
        href: '/admin/workspace',
        metadata: { taskId: task.id },
      });
    }
    return task;
  }

  async deleteTask(user: AuthenticatedUser, id: string) {
    await this.requireTask(user, id);
    await this.db
      .delete(workspaceTasks)
      .where(and(eq(workspaceTasks.id, id), eq(workspaceTasks.organizationId, user.organizationId)));
    return { deleted: true, id };
  }

  async listTaskComments(user: AuthenticatedUser, taskId: string) {
    await this.requireTask(user, taskId);
    const rows = await this.db
      .select({ comment: workspaceTaskComments, authorName: users.name, authorRole: users.role })
      .from(workspaceTaskComments)
      .leftJoin(users, eq(workspaceTaskComments.authorUserId, users.id))
      .where(
        and(
          eq(workspaceTaskComments.taskId, taskId),
          eq(workspaceTaskComments.organizationId, user.organizationId),
        ),
      )
      .orderBy(asc(workspaceTaskComments.createdAt));

    return rows.map((row) => ({
      ...row.comment,
      authorName: row.authorName,
      authorRole: row.authorRole,
    }));
  }

  async createTaskComment(
    user: AuthenticatedUser,
    taskId: string,
    input: CreateWorkspaceTaskCommentDto,
  ) {
    const task = await this.requireTask(user, taskId);
    const [comment] = await this.db
      .insert(workspaceTaskComments)
      .values({
        organizationId: user.organizationId,
        taskId,
        authorUserId: user.id,
        body: input.body.trim(),
      })
      .returning();
    void this.postActivity({
      organizationId: user.organizationId,
      event: 'task-commented',
      body: `Comment added on task: ${task.title}`,
      href: '/admin/workspace',
      metadata: { taskId: task.id, commentId: comment.id },
    });
    return { ...comment, authorName: user.name, authorRole: user.role };
  }

  async deleteTaskComment(user: AuthenticatedUser, id: string) {
    const [comment] = await this.db
      .select()
      .from(workspaceTaskComments)
      .where(
        and(eq(workspaceTaskComments.id, id), eq(workspaceTaskComments.organizationId, user.organizationId)),
      )
      .limit(1);
    if (!comment) throw new NotFoundException('Comment not found.');

    await this.requireTask(user, comment.taskId);
    await this.db.delete(workspaceTaskComments).where(eq(workspaceTaskComments.id, id));
    return { deleted: true, id };
  }

  async listPages(user: AuthenticatedUser) {
    await this.ensurePageDefault({
      organizationId: user.organizationId,
      title: 'Team Notes',
      slug: 'team-notes',
      text: '# Team Notes\n\nUse this page for shared notes, SOPs, and working agreements.',
    });

    const pages = await this.db
      .select()
      .from(workspacePages)
      .where(eq(workspacePages.organizationId, user.organizationId))
      .orderBy(desc(workspacePages.updatedAt));

    return pages.map((page) => ({
      ...page,
      content: page.content ?? { format: 'markdown' as const, text: '' },
    }));
  }

  async createPage(user: AuthenticatedUser, input: CreateWorkspacePageDto) {
    await this.ensureClient(input.clientId, user.organizationId);
    const [page] = await this.db
      .insert(workspacePages)
      .values({
        organizationId: user.organizationId,
        clientId: input.clientId,
        title: input.title.trim(),
        slug: await this.uniqueSlug('page', user.organizationId, input.title),
        content: { format: 'markdown', text: input.text ?? '' },
        createdByUserId: user.id,
        updatedByUserId: user.id,
      })
      .returning();
    return { ...page, content: page.content ?? { format: 'markdown' as const, text: '' } };
  }

  async updatePage(user: AuthenticatedUser, id: string, input: UpdateWorkspacePageDto) {
    await this.requirePage(user, id);
    const [page] = await this.db
      .update(workspacePages)
      .set({
        title: input.title?.trim(),
        content: input.text === undefined ? undefined : { format: 'markdown', text: input.text },
        updatedByUserId: user.id,
        updatedAt: new Date(),
      })
      .where(and(eq(workspacePages.id, id), eq(workspacePages.organizationId, user.organizationId)))
      .returning();
    return page;
  }

  async deletePage(user: AuthenticatedUser, id: string) {
    await this.requirePage(user, id);
    await this.db
      .delete(workspacePages)
      .where(and(eq(workspacePages.id, id), eq(workspacePages.organizationId, user.organizationId)));
    return { deleted: true, id };
  }

  private async requireChannelAccess(
    user: AuthenticatedUser,
    channelId: string,
    requireManage = false,
  ): Promise<ChannelRecord> {
    const [channel] = await this.db
      .select()
      .from(workspaceChannels)
      .where(
        and(
          eq(workspaceChannels.id, channelId),
          eq(workspaceChannels.organizationId, user.organizationId),
        ),
      )
      .limit(1);
    if (!channel) throw new NotFoundException('Channel not found.');
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return channel;
    if (channel.visibility === 'PUBLIC' && !requireManage) return channel;

    const [member] = await this.db
      .select()
      .from(workspaceChannelMembers)
      .where(
        and(
          eq(workspaceChannelMembers.channelId, channelId),
          eq(workspaceChannelMembers.userId, user.id),
        ),
      )
      .limit(1);
    if (!member || (requireManage && member.role !== 'OWNER'))
      throw new ForbiddenException('You do not have access to this channel.');
    return channel;
  }

  private async requireTask(user: AuthenticatedUser, id: string) {
    const [task] = await this.db
      .select()
      .from(workspaceTasks)
      .where(and(eq(workspaceTasks.id, id), eq(workspaceTasks.organizationId, user.organizationId)))
      .limit(1);
    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }

  private async requireBoard(user: AuthenticatedUser, id: string) {
    const [board] = await this.db
      .select()
      .from(workspaceBoards)
      .where(and(eq(workspaceBoards.id, id), eq(workspaceBoards.organizationId, user.organizationId)))
      .limit(1);
    if (!board) throw new NotFoundException('Board not found.');
    return board;
  }

  private async requirePage(user: AuthenticatedUser, id: string) {
    const [page] = await this.db
      .select({ id: workspacePages.id })
      .from(workspacePages)
      .where(and(eq(workspacePages.id, id), eq(workspacePages.organizationId, user.organizationId)))
      .limit(1);
    if (!page) throw new NotFoundException('Page not found.');
  }

  private async ensureClient(clientId: string | undefined, organizationId: string) {
    if (!clientId) return;
    const [client] = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .limit(1);
    if (!client) throw new NotFoundException('Client not found.');
  }

  private async ensureBoard(boardId: string | undefined, organizationId: string) {
    if (!boardId) return;
    const [board] = await this.db
      .select({ id: workspaceBoards.id })
      .from(workspaceBoards)
      .where(
        and(eq(workspaceBoards.id, boardId), eq(workspaceBoards.organizationId, organizationId)),
      )
      .limit(1);
    if (!board) throw new NotFoundException('Board not found.');
  }

  private async uniqueSlug(
    kind: 'channel' | 'board' | 'page',
    organizationId: string,
    name: string,
  ) {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;
    while (await this.slugExists(kind, organizationId, candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private async ensureChannelDefault(input: {
    organizationId: string;
    name: string;
    slug: string;
    description: string;
    type: 'GENERAL' | 'SYSTEM';
  }) {
    const [existing] = await this.db
      .select()
      .from(workspaceChannels)
      .where(
        and(
          eq(workspaceChannels.organizationId, input.organizationId),
          eq(workspaceChannels.slug, input.slug),
        ),
      )
      .limit(1);

    if (existing) return existing;

    const [channel] = await this.db
      .insert(workspaceChannels)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        type: input.type,
        visibility: 'PUBLIC',
      })
      .onConflictDoNothing()
      .returning();

    if (channel) return channel;

    const [createdByConcurrentRequest] = await this.db
      .select()
      .from(workspaceChannels)
      .where(
        and(
          eq(workspaceChannels.organizationId, input.organizationId),
          eq(workspaceChannels.slug, input.slug),
        ),
      )
      .limit(1);

    return createdByConcurrentRequest;
  }

  private async ensureBoardDefault(input: {
    organizationId: string;
    name: string;
    slug: string;
    description: string;
  }) {
    const [existing] = await this.db
      .select({ id: workspaceBoards.id })
      .from(workspaceBoards)
      .where(
        and(
          eq(workspaceBoards.organizationId, input.organizationId),
          eq(workspaceBoards.slug, input.slug),
        ),
      )
      .limit(1);

    if (existing) return;

    await this.db.insert(workspaceBoards).values(input).onConflictDoNothing();
  }

  private async ensurePageDefault(input: {
    organizationId: string;
    title: string;
    slug: string;
    text: string;
  }) {
    const [existing] = await this.db
      .select({ id: workspacePages.id })
      .from(workspacePages)
      .where(
        and(
          eq(workspacePages.organizationId, input.organizationId),
          eq(workspacePages.slug, input.slug),
        ),
      )
      .limit(1);

    if (existing) return;

    await this.db
      .insert(workspacePages)
      .values({
        organizationId: input.organizationId,
        title: input.title,
        slug: input.slug,
        content: { format: 'markdown', text: input.text },
        visibility: 'PUBLIC',
      })
      .onConflictDoNothing();
  }

  private async ensureSystemMessage(channelId: string, organizationId: string, body: string) {
    const [existing] = await this.db
      .select({ id: workspaceMessages.id })
      .from(workspaceMessages)
      .where(and(eq(workspaceMessages.channelId, channelId), eq(workspaceMessages.body, body)))
      .limit(1);

    if (existing) return;

    await this.db.insert(workspaceMessages).values({
      organizationId,
      channelId,
      body,
      metadata: { system: true },
    });
  }

  private async slugExists(
    kind: 'channel' | 'board' | 'page',
    organizationId: string,
    slug: string,
  ) {
    const table =
      kind === 'channel' ? workspaceChannels : kind === 'board' ? workspaceBoards : workspacePages;
    const [record] = await this.db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.organizationId, organizationId), eq(table.slug, slug)))
      .limit(1);
    return Boolean(record);
  }
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled';
}
