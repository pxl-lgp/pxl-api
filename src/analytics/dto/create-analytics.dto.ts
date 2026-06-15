import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateAnalyticsDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  @IsUUID()
  contentItemId!: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reach?: number;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  impressions?: number;

  @ApiPropertyOptional({ example: 143 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  engagement?: number;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clicks?: number;

  @ApiPropertyOptional({ example: 98 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  likes?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  comments?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shares?: number;

  @ApiPropertyOptional({ example: 21 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  saves?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  followersGained?: number;

  @ApiPropertyOptional({ example: '2026-06-01T10:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  capturedAt?: Date;
}
