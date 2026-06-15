import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

const clientStatuses = ['LEAD', 'ONBOARDING', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const;

export type ClientStatus = (typeof clientStatuses)[number];

export class CreateClientDto {
  @ApiProperty({ example: 'PXL Sample Restaurant' })
  @IsString()
  @MinLength(2)
  businessName!: string;

  @ApiPropertyOptional({ example: 'Restaurant' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: 'maria@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+639171234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: {
      facebook: 'https://facebook.com/pxl-sample',
      instagram: 'https://instagram.com/pxl-sample',
    },
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({ example: 'Increase bookings and promote weekly offers.' })
  @IsOptional()
  @IsString()
  goals?: string;

  @ApiPropertyOptional({ example: 'Friendly, food-forward, local community tone.' })
  @IsOptional()
  @IsString()
  brandNotes?: string;

  @ApiPropertyOptional({ example: ['content strategy', 'reels', 'monthly reporting'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicesNeeded?: string[];

  @ApiPropertyOptional({
    enum: clientStatuses,
    example: 'ONBOARDING',
  })
  @IsOptional()
  @IsEnum(clientStatuses)
  status?: ClientStatus;

  @ApiPropertyOptional({ example: 'https://drive.google.com/drive/folders/example' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  driveFolderUrl?: string;
}
