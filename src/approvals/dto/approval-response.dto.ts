import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovalResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  contentItemId!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REVISION_REQUESTED'], example: 'PENDING' })
  status!: 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';

  @ApiPropertyOptional({ example: 'Please revise the opening hook.' })
  feedback!: string | null;

  @ApiProperty({ example: 1 })
  revisionCount!: number;

  @ApiPropertyOptional({ example: '2026-05-30T17:11:56.365Z' })
  decidedAt!: Date | null;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  updatedAt!: Date;
}
