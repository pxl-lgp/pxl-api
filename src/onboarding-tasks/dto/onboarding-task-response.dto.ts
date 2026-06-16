import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardingTaskResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string;

  @ApiProperty({ example: 'Collect brand assets & guidelines' })
  title!: string;

  @ApiPropertyOptional({ example: 'Logo, fonts, colors, brand voice.' })
  description!: string | null;

  @ApiProperty({ enum: ['PENDING', 'IN_PROGRESS', 'DONE'], example: 'PENDING' })
  status!: 'PENDING' | 'IN_PROGRESS' | 'DONE';

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiPropertyOptional({ example: '2026-06-16T10:00:00.000Z' })
  completedAt!: Date | null;

  @ApiProperty({ example: '2026-06-16T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-16T10:00:00.000Z' })
  updatedAt!: Date;
}
