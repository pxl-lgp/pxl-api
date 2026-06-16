import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateContentTemplateDto {
  @ApiPropertyOptional({
    example: '6b4b8b91-f27d-46ab-850c-a5d32970188b',
    description: 'Omit for a shared, agency-wide template available to every client.',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ example: 'Promo Reel Template' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'reel' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  contentType!: string;

  @ApiPropertyOptional({ example: 'Instagram' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  platform?: string;

  @ApiProperty({
    example: 'Hook: [opener]\nBody: [offer]\nProof: [result]\nCTA: [action]',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  body!: string;
}
