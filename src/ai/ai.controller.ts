import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiService } from './ai.service';
import { AiGenerationDto } from './dto/ai-generation.dto';
import { AiGenerationResponseDto } from './dto/ai-generation-response.dto';
import { AnalyzePerformanceDto } from './dto/analyze-performance.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-caption')
  @ApiOperation({ summary: 'Generate caption draft' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can use AI tools.' })
  generateCaption(@Body() input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.aiService.generateCaption(input);
  }

  @Post('generate-hashtags')
  @ApiOperation({ summary: 'Generate hashtag suggestions' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  generateHashtags(@Body() input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.aiService.generateHashtags(input);
  }

  @Post('generate-reel-script')
  @ApiOperation({ summary: 'Generate reel script draft' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  generateReelScript(@Body() input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.aiService.generateReelScript(input);
  }

  @Post('generate-brief')
  @ApiOperation({ summary: 'Generate creative brief draft' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  generateBrief(@Body() input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.aiService.generateBrief(input);
  }

  @Post('generate-broll')
  @ApiOperation({ summary: 'Generate B-roll / supporting shot suggestions for a reel' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  generateBroll(@Body() input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.aiService.generateBroll(input);
  }

  @Post('generate-overlay')
  @ApiOperation({ summary: 'Generate on-screen overlay / caption text per scene' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  generateOverlay(@Body() input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.aiService.generateOverlay(input);
  }

  @Post('generate-tags')
  @ApiOperation({ summary: 'Generate asset-library tag suggestions' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  generateTags(@Body() input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.aiService.generateTags(input);
  }

  @Post('generate-template')
  @ApiOperation({ summary: 'Generate a reusable content template' })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  generateTemplate(@Body() input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.aiService.generateTemplate(input);
  }

  @Post('analyze-performance')
  @ApiOperation({
    summary: 'Generate AI performance insights and recommendations from analytics metrics',
  })
  @ApiOkResponse({ type: AiGenerationResponseDto })
  analyzePerformance(@Body() input: AnalyzePerformanceDto): Promise<AiGenerationResponseDto> {
    return this.aiService.analyzePerformance(input);
  }
}
