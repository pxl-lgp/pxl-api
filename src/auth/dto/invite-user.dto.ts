import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../users/users.service';

export class InviteUserDto {
  @ApiProperty({ example: 'client@pxl.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'PXL Client' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: ['ADMIN', 'TEAM', 'CLIENT'], example: 'CLIENT' })
  @IsEnum(['ADMIN', 'TEAM', 'CLIENT'])
  role!: UserRole;
}
