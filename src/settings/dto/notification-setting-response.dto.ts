import { ApiProperty } from '@nestjs/swagger';

export class NotificationSettingResponseDto {
  @ApiProperty({ example: 'new-lead' })
  eventKey!: string;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: ['ops@pxl.local'], isArray: true })
  recipients!: string[];
}
