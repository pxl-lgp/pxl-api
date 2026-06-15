import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class ScheduleContentDto {
  @ApiProperty({ example: '2026-06-15T09:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;
}
