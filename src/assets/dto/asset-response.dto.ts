import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssetResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string;

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  contentItemId!: string | null;

  @ApiProperty({ example: 'June promo reel final cut' })
  name!: string;

  @ApiProperty({ example: 'video' })
  assetType!: string;

  @ApiProperty({ example: 'https://drive.google.com/file/d/example' })
  driveUrl!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: ['approved', 'june', 'reels'] })
  tags!: string[];

  @ApiProperty({ example: '2026-06-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-01T10:00:00.000Z' })
  updatedAt!: Date;
}
