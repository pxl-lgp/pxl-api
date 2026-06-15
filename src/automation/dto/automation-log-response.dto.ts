import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutomationLogResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: 'client-created' })
  eventName!: string;

  @ApiProperty({ enum: ['PENDING', 'SENT', 'SUCCEEDED', 'FAILED'], example: 'SUCCEEDED' })
  status!: 'PENDING' | 'SENT' | 'SUCCEEDED' | 'FAILED';

  @ApiProperty({ example: 'client' })
  entityType!: string;

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  entityId!: string | null;

  @ApiProperty({ example: { businessName: 'PXL Sample Restaurant' } })
  payload!: Record<string, unknown>;

  @ApiProperty({ example: { status: 200, body: 'ok' } })
  response!: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'n8n webhook responded 500: workflow error' })
  errorMessage!: string | null;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  updatedAt!: Date;
}
