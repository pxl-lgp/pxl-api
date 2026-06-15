import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../users/users.service';

export class RegisterDto {
  @ApiProperty({ example: 'team@pxl.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'PXL Team Member' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'change-this-password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: ['ADMIN', 'TEAM', 'CLIENT'], example: 'TEAM', required: false })
  @IsOptional()
  @IsEnum(['ADMIN', 'TEAM', 'CLIENT'])
  role?: UserRole;
}
