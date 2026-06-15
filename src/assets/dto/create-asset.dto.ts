import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUrl, IsUUID, Min, MinLength } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  @IsUUID()
  clientId!: string;

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  @IsOptional()
  @IsUUID()
  contentItemId?: string;

  @ApiProperty({ example: 'June promo reel final cut' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'video' })
  @IsString()
  @MinLength(2)
  assetType!: string;

  @ApiProperty({ example: 'https://drive.google.com/file/d/example' })
  @IsUrl({ require_tld: false })
  driveUrl!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ example: ['approved', 'june', 'reels'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
