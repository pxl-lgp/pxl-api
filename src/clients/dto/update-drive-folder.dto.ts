import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class UpdateDriveFolderDto {
  @ApiProperty({ example: 'https://drive.google.com/drive/folders/example' })
  @IsUrl({ require_tld: false })
  driveFolderUrl!: string;
}
