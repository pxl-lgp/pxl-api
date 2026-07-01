import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateWorkspaceChannelDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['GENERAL', 'CLIENT', 'PROJECT', 'SYSTEM'])
  type?: 'GENERAL' | 'CLIENT' | 'PROJECT' | 'SYSTEM';

  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';

  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class UpdateWorkspaceChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';
}

export class CreateWorkspaceMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class CreateWorkspaceBoardDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class UpdateWorkspaceBoardDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateWorkspaceTaskDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  boardId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'])
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;
}

export class UpdateWorkspaceTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'])
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;
}

export class CreateWorkspaceTaskCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class CreateWorkspacePageDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class UpdateWorkspacePageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  text?: string;
}
