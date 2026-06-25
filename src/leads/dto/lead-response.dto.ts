import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  organizationId!: string;

  @ApiProperty({ example: 'PXL Sample Restaurant' })
  businessName!: string;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  contactPerson!: string | null;

  @ApiProperty({ example: 'maria@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: '+639171234567' })
  phone!: string | null;

  @ApiPropertyOptional({ example: 'Website lead form' })
  source!: string | null;

  @ApiPropertyOptional({ example: 'Interested in monthly social media management.' })
  message!: string | null;

  @ApiProperty({ enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'], example: 'NEW' })
  status!: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';

  @ApiProperty({ example: 78, description: 'Heuristic lead-qualification score (0-100).' })
  score!: number;

  @ApiProperty({ enum: ['COLD', 'WARM', 'HOT'], example: 'HOT' })
  scoreBand!: 'COLD' | 'WARM' | 'HOT';

  @ApiProperty({ type: [String], example: ['Provided a phone number (+15)'] })
  scoreReasons!: string[];

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string | null;

  @ApiProperty({ example: '2026-05-31T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-31T10:00:00.000Z' })
  updatedAt!: Date;
}
