import { ApiProperty } from '@nestjs/swagger';

export class PageVisitSummaryDto {
  @ApiProperty({ example: '/' })
  path!: string;

  @ApiProperty({ example: 128 })
  total!: number;

  @ApiProperty({ example: 12 })
  today!: number;

  @ApiProperty({ example: 54 })
  last7Days!: number;

  @ApiProperty({ example: 118 })
  last30Days!: number;
}
