import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional({ enum: leadStatuses, example: 'CONTACTED' })
  @IsOptional()
  @IsEnum(leadStatuses)
  status?: LeadStatus;

  @ApiPropertyOptional({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  @IsOptional()
  @IsUUID()
  clientId?: string;
}
