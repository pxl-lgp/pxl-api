import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CampaignResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string;

  @ApiProperty({ example: 'June Awareness Push' })
  name!: string;

  @ApiProperty({ enum: ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED'], example: 'PLANNED' })
  status!: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

  @ApiPropertyOptional({ example: 'Increase qualified inquiries for June promo.' })
  goal!: string | null;

  @ApiPropertyOptional({ example: 'PHP 50,000' })
  budget!: string | null;

  @ApiPropertyOptional({ example: 'Metro Manila coffee buyers, 25-40.' })
  audience!: string | null;

  @ApiPropertyOptional({ example: 'Free pastry with any large coffee.' })
  offer!: string | null;

  @ApiPropertyOptional({ example: 'Prioritize Reels and weekend reminders.' })
  notes!: string | null;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  startsAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.000Z' })
  endsAt!: Date | null;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  updatedAt!: Date;
}
