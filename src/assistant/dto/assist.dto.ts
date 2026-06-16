import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AssistDto {
  @ApiProperty({ example: 'Do you handle Instagram reels for restaurants?' })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({ example: 'Maria from Cafe Luna' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;
}
