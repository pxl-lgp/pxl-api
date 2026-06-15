import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { socialPlatforms, SocialPlatform } from '../social-platform';

export class SocialTargetDto {
  @ApiProperty()
  @IsUUID()
  connectionId!: string;

  @ApiProperty({ enum: socialPlatforms })
  @IsEnum(socialPlatforms)
  platform!: SocialPlatform;
}
