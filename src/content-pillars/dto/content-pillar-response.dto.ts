import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContentPillarResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string;

  @ApiProperty({ example: 'Behind the Scenes' })
  name!: string;

  @ApiPropertyOptional({ example: 'Day-to-day moments that build trust.' })
  description!: string | null;

  @ApiProperty({ example: 4 })
  cadencePerMonth!: number;

  @ApiProperty({ example: '2026-06-16T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-16T10:00:00.000Z' })
  updatedAt!: Date;
}
