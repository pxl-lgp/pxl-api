import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  contentItemId!: string;

  @ApiProperty({ example: 1200 })
  reach!: number;

  @ApiProperty({ example: 1800 })
  impressions!: number;

  @ApiProperty({ example: 143 })
  engagement!: number;

  @ApiProperty({ example: 42 })
  clicks!: number;

  @ApiProperty({ example: 98 })
  likes!: number;

  @ApiProperty({ example: 12 })
  comments!: number;

  @ApiProperty({ example: 8 })
  shares!: number;

  @ApiProperty({ example: 21 })
  saves!: number;

  @ApiProperty({ example: 6 })
  followersGained!: number;

  @ApiProperty({ example: '2026-06-01T10:00:00.000Z' })
  capturedAt!: Date;

  @ApiProperty({ example: '2026-06-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-01T10:00:00.000Z' })
  updatedAt!: Date;
}
