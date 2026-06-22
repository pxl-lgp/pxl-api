import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    example: 'ok',
    description: 'Current service health status.',
  })
  status!: string;

  @ApiProperty({
    example: 'pxl-api',
    description: 'Service identifier.',
  })
  service!: string;

  @ApiProperty({
    example: '2026-05-30T17:11:56.365Z',
    description: 'Server timestamp in ISO 8601 format.',
  })
  timestamp!: string;

  @ApiProperty({
    example: 'up',
    description: 'Database connectivity status. Only present on the readiness check.',
    required: false,
  })
  database?: string;

  @ApiProperty({ example: 1234, required: false })
  uptime?: number;

  @ApiProperty({ example: 51200000, required: false })
  memory?: number;
}
