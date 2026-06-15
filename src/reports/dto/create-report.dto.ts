import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ example: 'June Performance Report' })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  periodStart!: Date;

  @ApiProperty({ example: '2026-06-30T23:59:59.000Z' })
  @Type(() => Date)
  @IsDate()
  periodEnd!: Date;

  @ApiPropertyOptional({ example: 'Reach improved month over month, with reels driving most engagement.' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: 'https://drive.google.com/report' })
  @IsOptional()
  @IsString()
  driveUrl?: string;
}
