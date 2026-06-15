import { ApiProperty } from '@nestjs/swagger';

export class AiGenerationResponseDto {
  @ApiProperty({ example: 'groq' })
  provider!: string;

  @ApiProperty({ example: 'fallback' })
  model!: string;

  @ApiProperty({ example: 'Generated draft text...' })
  output!: string;
}
