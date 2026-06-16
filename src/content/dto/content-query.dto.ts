import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { contentStatuses, ContentStatus } from './create-content-item.dto';

export class ContentQueryDto {
  @ApiPropertyOptional({ description: 'Filter by client.' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by campaign.' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ enum: contentStatuses, description: 'Filter by content status.' })
  @IsOptional()
  @IsEnum(contentStatuses)
  status?: ContentStatus;

  @ApiPropertyOptional({ description: 'Filter by content type (e.g. reel, post).' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive search over the content title.' })
  @IsOptional()
  @IsString()
  q?: string;
}
