import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AssetQueryDto {
  @ApiPropertyOptional({ description: 'Filter by client.' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by linked content item.' })
  @IsOptional()
  @IsUUID()
  contentItemId?: string;

  @ApiPropertyOptional({ description: 'Filter by asset type (e.g. logo, reel, report).' })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive search over the asset name.' })
  @IsOptional()
  @IsString()
  q?: string;
}
