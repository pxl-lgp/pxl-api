import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { AiGenerationDto } from './dto/ai-generation.dto';
import { AiGenerationResponseDto } from './dto/ai-generation-response.dto';

type AiTask = 'caption' | 'hashtags' | 'reel-script' | 'brief';

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  generateCaption(input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.generate('caption', input);
  }

  generateHashtags(input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.generate('hashtags', input);
  }

  generateReelScript(input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.generate('reel-script', input);
  }

  generateBrief(input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.generate('brief', input);
  }

  private async generate(task: AiTask, input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    const provider = this.config.get('AI_PROVIDER', { infer: true });
    const apiKey = provider === 'openai' ? this.config.get('OPENAI_API_KEY', { infer: true }) : this.config.get('GROQ_API_KEY', { infer: true });

    if (!apiKey || provider === 'ollama') {
      return {
        provider,
        model: 'fallback',
        output: this.fallbackDraft(task, input),
      };
    }

    const model = this.config.get('AI_MODEL', { infer: true }) ?? (provider === 'openai' ? 'gpt-4o-mini' : 'llama-3.1-8b-instant');
    const endpoint =
      provider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content:
                'You draft marketing operations content. Be concise, practical, brand-safe, and do not claim final approval.',
            },
            {
              role: 'user',
              content: this.buildPrompt(task, input),
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        return {
          provider,
          model: 'fallback',
          output: this.fallbackDraft(task, input),
        };
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const output = data.choices?.[0]?.message?.content?.trim() || this.fallbackDraft(task, input);

      return {
        provider,
        model,
        output,
      };
    } catch {
      return {
        provider,
        model: 'fallback',
        output: this.fallbackDraft(task, input),
      };
    }
  }

  private buildPrompt(task: AiTask, input: AiGenerationDto): string {
    const context = [
      `Client: ${input.clientName}`,
      `Industry: ${input.industry ?? 'not specified'}`,
      `Content title: ${input.contentTitle}`,
      `Content type: ${input.contentType}`,
      `Platform: ${input.platform ?? 'not specified'}`,
      `Goals: ${input.goals ?? 'not specified'}`,
      `Brand notes: ${input.brandNotes ?? 'not specified'}`,
      `Context: ${input.context ?? 'not specified'}`,
      `Tone: ${input.tone ?? 'friendly, clear, useful'}`,
      `Existing hashtags: ${input.hashtags?.join(', ') || 'none'}`,
    ].join('\n');

    const instructions: Record<AiTask, string> = {
      caption: 'Draft 2 social caption options with a clear CTA. Keep each under 120 words.',
      hashtags: 'Suggest 12 hashtags. Return comma-separated hashtags only.',
      'reel-script': 'Draft a short-form reel script with hook, scene flow, overlay text, and CTA.',
      brief: 'Draft a creative brief with objective, audience, message, asset notes, and review checklist.',
    };

    return `${context}\n\nTask: ${instructions[task]}`;
  }

  private fallbackDraft(task: AiTask, input: AiGenerationDto): string {
    const platform = input.platform ?? 'social';
    const business = input.clientName;
    const title = input.contentTitle;

    if (task === 'hashtags') {
      return ['brand', 'localbusiness', input.industry, input.contentType, platform, 'marketing', 'promo']
        .filter(Boolean)
        .map((tag) => `#${String(tag).replace(/\s+/g, '').toLowerCase()}`)
        .join(', ');
    }

    if (task === 'reel-script') {
      return `Hook: Need a quick reason to check out ${business}?\nScene 1: Show the main offer for ${title}.\nScene 2: Highlight the benefit in one clear line.\nScene 3: Add proof, product detail, or customer moment.\nCTA: Message ${business} today or visit the page for details.`;
    }

    if (task === 'brief') {
      return `Objective: Create ${platform} content for ${business} about ${title}.\nAudience: Current and potential customers.\nMessage: Make the offer clear, useful, and easy to act on.\nAssets: Brand visuals, product/service shots, logo, and CTA.\nReview: Confirm accuracy, tone, platform fit, and final approval before publishing.`;
    }

    return `Option 1: ${title} is here for ${business}. Discover what makes it useful, timely, and worth checking out. Message us today to learn more.\n\nOption 2: Looking for something new from ${business}? ${title} gives you a simple reason to take action today. Send us a message for details.`;
  }
}
