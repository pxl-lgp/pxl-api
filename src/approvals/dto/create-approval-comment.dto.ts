import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApprovalCommentDto {
  @ApiProperty({ example: 'Can we make the CTA stronger before publishing?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}
