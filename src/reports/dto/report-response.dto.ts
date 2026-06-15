import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string;

  @ApiProperty({ example: 'June Performance Report' })
  title!: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  periodStart!: Date;

  @ApiProperty({ example: '2026-06-30T23:59:59.000Z' })
  periodEnd!: Date;

  @ApiPropertyOptional({ example: 'Reach improved month over month.' })
  summary!: string | null;

  @ApiPropertyOptional({ example: 'https://drive.google.com/report' })
  driveUrl!: string | null;

  @ApiProperty({ example: '2026-06-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-01T10:00:00.000Z' })
  updatedAt!: Date;
}
