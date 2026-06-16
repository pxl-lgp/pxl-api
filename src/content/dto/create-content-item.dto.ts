import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { socialPlatforms, SocialPlatform } from '../social-platform';
import { SocialTargetDto } from './social-target.dto';

export const contentStatuses = [
  'IDEA',
  'DRAFTING',
  'DESIGNING',
  'INTERNAL_REVIEW',
  'CLIENT_APPROVAL',
  'APPROVED',
  'REVISION_REQUESTED',
  'SCHEDULED',
  'PUBLISHED',
  'REPORTED',
] as const;

export type ContentStatus = (typeof contentStatuses)[number];

export class CreateContentItemDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  @IsUUID()
  clientId!: string;

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiProperty({ example: 'June promo reel' })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiProperty({ example: 'reel' })
  @IsString()
  @MinLength(2)
  contentType!: string;

  @ApiPropertyOptional({ example: 'Instagram' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    enum: socialPlatforms,
    isArray: true,
    example: ['FACEBOOK_PAGE', 'INSTAGRAM'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(socialPlatforms, { each: true })
  platforms?: SocialPlatform[];

  @ApiPropertyOptional({ type: SocialTargetDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialTargetDto)
  socialTargets?: SocialTargetDto[];

  @ApiPropertyOptional({ enum: contentStatuses, example: 'IDEA' })
  @IsOptional()
  @IsEnum(contentStatuses)
  status?: ContentStatus;

  @ApiPropertyOptional({ example: 'Fresh offers for the weekend.' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ example: ['promo', 'restaurant', 'weekend'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/campaign/june-promo.jpg',
    description: 'Publicly reachable image or video URL used by Meta when publishing.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  mediaUrl?: string;

  @ApiPropertyOptional({ example: '2026-06-15T09:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @ApiPropertyOptional({ example: '2026-06-15T09:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  publishedAt?: Date;
}
