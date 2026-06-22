import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'new-secure-password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
