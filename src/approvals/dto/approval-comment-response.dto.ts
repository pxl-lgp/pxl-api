import { ApiProperty } from '@nestjs/swagger';

export class ApprovalCommentResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  approvalId!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  clientId!: string;

  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b', nullable: true })
  authorUserId!: string | null;

  @ApiProperty({ example: 'PXL Admin' })
  authorName!: string;

  @ApiProperty({ enum: ['ADMIN', 'TEAM', 'CLIENT'], example: 'TEAM' })
  authorRole!: 'ADMIN' | 'TEAM' | 'CLIENT';

  @ApiProperty({ example: 'Can we make the CTA stronger before publishing?' })
  body!: string;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  updatedAt!: Date;
}
