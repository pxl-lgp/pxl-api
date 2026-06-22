import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsOptional } from 'class-validator';

export class UpdateNotificationSettingDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ example: ['ops@pxl.local'], required: false, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipients?: string[];
}
