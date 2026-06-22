import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../users.service';

export class UpdateUserDto {
  @ApiProperty({ example: 'team@pxl.local', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'PXL Team Member', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ enum: ['ADMIN', 'TEAM', 'CLIENT'], example: 'TEAM', required: false })
  @IsOptional()
  @IsEnum(['ADMIN', 'TEAM', 'CLIENT'])
  role?: UserRole;

  @ApiProperty({ example: 'change-this-password', minLength: 8, required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
