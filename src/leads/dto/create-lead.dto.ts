import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ example: 'PXL Sample Restaurant' })
  @IsString()
  @MinLength(2)
  businessName!: string;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+639171234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Website lead form' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'Interested in monthly social media management and reels.' })
  @IsOptional()
  @IsString()
  message?: string;
}
