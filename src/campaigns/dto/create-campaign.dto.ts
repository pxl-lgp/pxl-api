import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export const campaignStatuses = ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED'] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export class CreateCampaignDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ example: 'June Awareness Push' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ enum: campaignStatuses, example: 'PLANNED' })
  @IsOptional()
  @IsEnum(campaignStatuses)
  status?: CampaignStatus;

  @ApiPropertyOptional({ example: 'Increase qualified inquiries for June promo.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  goal?: string;

  @ApiPropertyOptional({ example: 'PHP 50,000' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  budget?: string;

  @ApiPropertyOptional({ example: 'Metro Manila coffee buyers, 25-40.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  audience?: string;

  @ApiPropertyOptional({ example: 'Free pastry with any large coffee.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  offer?: string;

  @ApiPropertyOptional({ example: 'Prioritize Reels and weekend reminders.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;
}
