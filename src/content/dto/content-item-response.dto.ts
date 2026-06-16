import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContentItemResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string;

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  campaignId!: string | null;

  @ApiProperty({ example: 'June promo reel' })
  title!: string;

  @ApiProperty({ example: 'reel' })
  contentType!: string;

  @ApiPropertyOptional({ example: 'Instagram' })
  platform!: string | null;

  @ApiProperty({
    enum: ['FACEBOOK_PAGE', 'INSTAGRAM'],
    isArray: true,
    example: ['FACEBOOK_PAGE', 'INSTAGRAM'],
  })
  platforms!: ('FACEBOOK_PAGE' | 'INSTAGRAM')[];

  @ApiProperty({
    isArray: true,
    example: [
      {
        connectionId: '6b4b8b91-f27d-46ab-850c-a5d32970188b',
        platform: 'FACEBOOK_PAGE',
      },
    ],
  })
  socialTargets!: Array<{
    connectionId: string;
    platform: 'FACEBOOK_PAGE' | 'INSTAGRAM';
  }>;

  @ApiProperty({
    enum: [
      'IDEA',
      'DRAFTING',
      'DESIGNING',
      'INTERNAL_REVIEW',
      'CLIENT_APPROVAL',
      'APPROVED',
      'REVISION_REQUESTED',
      'SCHEDULED',
      'PUBLISHED',
      'REPORTED',
    ],
    example: 'IDEA',
  })
  status!:
    | 'IDEA'
    | 'DRAFTING'
    | 'DESIGNING'
    | 'INTERNAL_REVIEW'
    | 'CLIENT_APPROVAL'
    | 'APPROVED'
    | 'REVISION_REQUESTED'
    | 'SCHEDULED'
    | 'PUBLISHED'
    | 'REPORTED';

  @ApiPropertyOptional({ example: 'Fresh offers for the weekend.' })
  caption!: string | null;

  @ApiProperty({ example: ['promo', 'restaurant', 'weekend'] })
  hashtags!: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/campaign/june-promo.jpg' })
  mediaUrl!: string | null;

  @ApiProperty({
    example: {
      FACEBOOK_PAGE: {
        status: 'SUCCEEDED',
        remoteId: '123456789_987654321',
        publishedAt: '2026-06-13T08:30:00.000Z',
      },
    },
  })
  publishResults!: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-06-15T09:00:00.000Z' })
  scheduledAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-06-15T09:00:00.000Z' })
  publishedAt!: Date | null;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  updatedAt!: Date;
}
