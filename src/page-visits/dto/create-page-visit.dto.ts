import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreatePageVisitDto {
  @ApiProperty({ example: '/' })
  @IsString()
  @MinLength(1)
  path!: string;
}
