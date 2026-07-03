import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePageVisitDto {
  @ApiProperty({ example: '/' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @IsIn(['/'])
  path!: string;
}
