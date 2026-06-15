import { ApiProperty } from '@nestjs/swagger';

export class MetaOauthUrlResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  expiresAt!: Date;
}
