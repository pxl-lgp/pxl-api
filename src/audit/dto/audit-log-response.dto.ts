import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b', nullable: true })
  actorUserId!: string | null;

  @ApiProperty({ example: 'user.updated' })
  action!: string;

  @ApiProperty({ example: 'user' })
  entityType!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b', nullable: true })
  entityId!: string | null;

  @ApiProperty({ example: { fields: ['email'] } })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: '2026-06-22T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-22T10:00:00.000Z' })
  updatedAt!: Date;
}
