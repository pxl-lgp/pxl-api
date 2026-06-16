import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from '../ai/ai.service';
import { AiGenerationResponseDto } from '../ai/dto/ai-generation-response.dto';
import { AssistDto } from './dto/assist.dto';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly aiService: AiService) {}

  // Public lead-gen chatbot endpoint (Workflow Study §11). Hard-throttled because
  // it is unauthenticated and fans out to an AI provider.
  @Post('chat')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Ask the public PXL intake assistant a question' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  chat(@Body() input: AssistDto): Promise<AiGenerationResponseDto> {
    return this.aiService.assist(input.message, input.clientName);
  }
}
