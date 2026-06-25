import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  organizationId!: string;

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  userId!: string | null;

  @ApiProperty({ example: 'PXL Sample Restaurant' })
  businessName!: string;

  @ApiPropertyOptional({ example: 'Restaurant' })
  industry!: string | null;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  contactPerson!: string | null;

  @ApiPropertyOptional({ example: 'maria@example.com' })
  email!: string | null;

  @ApiPropertyOptional({ example: '+639171234567' })
  phone!: string | null;

  @ApiProperty({
    example: {
      facebook: 'https://facebook.com/pxl-sample',
      instagram: 'https://instagram.com/pxl-sample',
    },
  })
  socialLinks!: Record<string, string>;

  @ApiPropertyOptional({ example: 'Increase bookings and promote weekly offers.' })
  goals!: string | null;

  @ApiPropertyOptional({ example: 'Friendly, food-forward, local community tone.' })
  brandNotes!: string | null;

  @ApiProperty({ example: ['content strategy', 'reels', 'monthly reporting'] })
  servicesNeeded!: string[];

  @ApiProperty({
    enum: ['LEAD', 'ONBOARDING', 'ACTIVE', 'PAUSED', 'ARCHIVED'],
    example: 'ONBOARDING',
  })
  status!: 'LEAD' | 'ONBOARDING' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

  @ApiPropertyOptional({ example: 'https://drive.google.com/drive/folders/example' })
  driveFolderUrl!: string | null;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  updatedAt!: Date;
}
