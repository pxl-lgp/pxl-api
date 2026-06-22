import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '6b4b8b91-f27d-46ab-850c-a5d32970188b' })
  id!: string;

  @ApiProperty({ example: 'admin@pxl.local' })
  email!: string;

  @ApiProperty({ example: 'PXL Admin' })
  name!: string;

  @ApiProperty({ enum: ['ADMIN', 'TEAM', 'CLIENT'], example: 'ADMIN' })
  role!: 'ADMIN' | 'TEAM' | 'CLIENT';

  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'], example: 'ACTIVE' })
  status!: 'ACTIVE' | 'DISABLED';

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-30T17:11:56.365Z' })
  updatedAt!: Date;
}
