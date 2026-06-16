import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { campaignStatuses, CampaignStatus } from './create-campaign.dto';

export class CampaignQueryDto {
  @ApiPropertyOptional({ description: 'Filter by client.' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ enum: campaignStatuses, description: 'Filter by campaign status.' })
  @IsOptional()
  @IsEnum(campaignStatuses)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'Case-insensitive search over campaign name.' })
  @IsOptional()
  @IsString()
  q?: string;
}
