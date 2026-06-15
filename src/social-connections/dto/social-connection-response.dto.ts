import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialConnectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  authorizationId!: string;

  @ApiProperty()
  facebookPageId!: string;

  @ApiProperty()
  facebookPageName!: string;

  @ApiPropertyOptional()
  instagramAccountId!: string | null;

  @ApiPropertyOptional()
  instagramUsername!: string | null;

  @ApiProperty({ enum: ['CONNECTED', 'EXPIRED', 'REVOKED'] })
  status!: 'CONNECTED' | 'EXPIRED' | 'REVOKED';

  @ApiPropertyOptional()
  tokenExpiresAt!: Date | null;

  @ApiProperty()
  lastVerifiedAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
