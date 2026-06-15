import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class PublicOnboardingDto {
  @ApiProperty({ example: 'PXL Sample Restaurant' })
  @IsString()
  @MinLength(2)
  businessName!: string;

  @ApiPropertyOptional({ example: 'Restaurant' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ example: 'Maria Santos' })
  @IsString()
  @MinLength(2)
  contactPerson!: string;

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+639171234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: {
      facebook: 'https://facebook.com/pxl-sample',
      instagram: 'https://instagram.com/pxl-sample',
      website: 'https://pxl-sample.com',
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
}
