import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOnboardingTaskDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'IN_PROGRESS', 'DONE'] })
  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'DONE'])
  status?: 'PENDING' | 'IN_PROGRESS' | 'DONE';

  @ApiPropertyOptional({ example: 'Collect brand assets & guidelines' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Logo, fonts, colors, brand voice.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
