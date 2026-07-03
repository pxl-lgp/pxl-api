import { ApiProperty } from '@nestjs/swagger';

export class PageVisitSummaryDto {
  @ApiProperty({ example: '/' })
  path!: string;

  @ApiProperty({ example: 128 })
  total!: number;
}
