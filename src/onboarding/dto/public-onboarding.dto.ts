import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PublicOnboardingDto {
  @ApiProperty({ example: 'PXL Sample Restaurant' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName!: string;

  @ApiPropertyOptional({ example: 'Restaurant' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @ApiProperty({ example: 'Maria Santos' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contactPerson!: string;

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'change-this-password', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @ApiPropertyOptional({ example: '+639171234567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
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
  @MaxLength(5000)
  goals?: string;

  @ApiPropertyOptional({ example: 'Friendly, food-forward, local community tone.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  brandNotes?: string;

  @ApiPropertyOptional({ example: ['content strategy', 'reels', 'monthly reporting'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  servicesNeeded?: string[];
}
