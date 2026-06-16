import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export type AiLanguage = 'EN' | 'TAGLISH';

export class AiGenerationDto {
  @ApiProperty({ example: 'PXL Sample Restaurant' })
  @IsString()
  clientName!: string;

  @ApiPropertyOptional({ example: 'Restaurant' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ example: 'June promo reel' })
  @IsString()
  contentTitle!: string;

  @ApiProperty({ example: 'reel' })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({ example: 'Instagram' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: 'Increase bookings and promote weekly offers.' })
  @IsOptional()
  @IsString()
  goals?: string;

  @ApiPropertyOptional({ example: 'Friendly, practical, Taglish when useful.' })
  @IsOptional()
  @IsString()
  brandNotes?: string;

  @ApiPropertyOptional({ example: 'Weekend promo for new menu items.' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ example: 'Friendly, concise, conversion-focused.' })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({ example: ['promo', 'restaurant'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({
    enum: ['EN', 'TAGLISH'],
    default: 'EN',
    description: 'Output language. TAGLISH produces a natural Tagalog-English mix for a Filipino audience.',
  })
  @IsOptional()
  @IsIn(['EN', 'TAGLISH'])
  language?: AiLanguage;

  @ApiPropertyOptional({
    default: false,
    description: 'When true, optimize captions for social SEO (keyword-rich first line, relevant keywords woven in).',
  })
  @IsOptional()
  @IsBoolean()
  seo?: boolean;
}
