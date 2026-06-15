import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export const approvalStatuses = ['PENDING', 'APPROVED', 'REVISION_REQUESTED'] as const;

export type ApprovalStatus = (typeof approvalStatuses)[number];

export class UpdateApprovalDto {
  @ApiProperty({ enum: approvalStatuses, example: 'APPROVED' })
  @IsEnum(approvalStatuses)
  status!: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Please revise the opening hook.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
