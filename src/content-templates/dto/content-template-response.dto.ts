import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContentTemplateResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b', nullable: true })
  clientId!: string | null;

  @ApiProperty({ example: 'Promo Reel Template' })
  name!: string;

  @ApiProperty({ example: 'reel' })
  contentType!: string;

  @ApiPropertyOptional({ example: 'Instagram' })
  platform!: string | null;

  @ApiProperty({ example: 'Hook: [opener]\nBody: [offer]\nProof: [result]\nCTA: [action]' })
  body!: string;

  @ApiProperty({ example: '2026-06-16T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-16T10:00:00.000Z' })
  updatedAt!: Date;
}
