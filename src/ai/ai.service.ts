import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { AiGenerationDto } from './dto/ai-generation.dto';
import { AiGenerationResponseDto } from './dto/ai-generation-response.dto';
import { AnalyzePerformanceDto } from './dto/analyze-performance.dto';
import { summarizePerformance } from './performance-insights';

type AiTask =
  | 'caption'
  | 'hashtags'
  | 'reel-script'
  | 'brief'
  | 'broll'
  | 'overlay'
  | 'tags'
  | 'template';

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

  // Workflow Study §6 — B-roll / supporting shot suggestions for reels & video.
  generateBroll(input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.generate('broll', input);
  }

  // Workflow Study §6 — on-screen overlay / caption text per scene.
  generateOverlay(input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.generate('overlay', input);
  }

  // Workflow Study §12 — AI asset tagging.
  generateTags(input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.generate('tags', input);
  }

  // Workflow Study §5 — reusable, template-based content generation.
  generateTemplate(input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.generate('template', input);
  }

  /**
   * Lead-gen chatbot / intake assistant (Workflow Study §11). Answers a visitor's
   * question about PXL's services and nudges them to leave their details. Brand-safe
   * and never promises pricing it cannot know.
   */
  async assist(message: string, clientName?: string): Promise<AiGenerationResponseDto> {
    const system =
      'You are the friendly assistant for PXL Digital Marketing, a Philippine social media agency ' +
      '(content creation, reels, graphics, scheduling, and reporting). Answer briefly and helpfully. ' +
      'If the visitor seems interested, invite them to share their business name, email, and what they need ' +
      'so the team can follow up. Never invent specific prices; say the team will send a tailored quote.';
    const user = clientName
      ? `Visitor (${clientName}) asks: ${message}`
      : `Visitor asks: ${message}`;

    return this.callModel(
      system,
      user,
      0.5,
      () =>
        'Thanks for reaching out to PXL Digital Marketing! We help businesses with social media content, ' +
        'reels, graphics, scheduling, and reporting. Share your business name, email, and what you need, ' +
        'and our team will get back to you with a tailored proposal.',
    );
  }

  async analyzePerformance(input: AnalyzePerformanceDto): Promise<AiGenerationResponseDto> {
    return this.callModel(
      'You are a social media analyst. Read the metrics and give concise, practical insights and 2-4 specific recommendations. Do not invent numbers.',
      this.buildPerformancePrompt(input),
      0.4,
      () => summarizePerformance(input),
    );
  }

  private buildPerformancePrompt(input: AnalyzePerformanceDto): string {
    const m = input.metrics;
    const context = [
      `Client: ${input.clientName}`,
      `Content: ${input.contentTitle ?? 'not specified'}`,
      `Type: ${input.contentType ?? 'not specified'}`,
      `Platform: ${input.platform ?? 'not specified'}`,
      '',
      'Metrics:',
      `- Reach: ${m.reach ?? 0}`,
      `- Impressions: ${m.impressions ?? 0}`,
      `- Engagement: ${m.engagement ?? 0}`,
      `- Clicks: ${m.clicks ?? 0}`,
      `- Likes: ${m.likes ?? 0}`,
      `- Comments: ${m.comments ?? 0}`,
      `- Shares: ${m.shares ?? 0}`,
      `- Saves: ${m.saves ?? 0}`,
      `- Followers gained: ${m.followersGained ?? 0}`,
    ].join('\n');

    return `${context}\n\nTask: Summarize how this content performed and give 2-4 specific, practical recommendations.`;
  }

  private generate(task: AiTask, input: AiGenerationDto): Promise<AiGenerationResponseDto> {
    return this.callModel(
      'You draft marketing operations content. Be concise, practical, brand-safe, and do not claim final approval.',
      this.buildPrompt(task, input),
      0.7,
      () => this.fallbackDraft(task, input),
    );
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
      brief:
        'Draft a creative brief with objective, audience, message, asset notes, and review checklist.',
      broll:
        'Suggest 6-8 B-roll / supporting shot ideas for this reel. Return a numbered list, one shot per line.',
      overlay:
        'Write the on-screen overlay text (auto-caption lines) for each scene of this reel. Keep each line under 8 words.',
      tags: 'Suggest 8-12 short asset-library tags (lowercase, no #). Return comma-separated tags only.',
      template:
        'Create a reusable content template with labelled sections (Hook, Body, Proof, CTA) that the team can refill for future posts.',
    };

    const style = this.buildStyle(task, input);

    return [context, '', `Task: ${instructions[task]}`, ...(style ? ['', style] : [])].join('\n');
  }

  private buildStyle(task: AiTask, input: AiGenerationDto): string {
    // Tags are an internal taxonomy; keep them English/neutral regardless of flags.
    if (task === 'tags') {
      return '';
    }

    const notes: string[] = [];

    if (input.language === 'TAGLISH') {
      notes.push(
        'Write in natural conversational Taglish (a Tagalog-English mix) suited to a Filipino social media audience. Keep it authentic and casual, not formal or robotic.',
      );
    }

    if (input.seo && (task === 'caption' || task === 'template')) {
      notes.push(
        'Optimize for social SEO: lead with a keyword-rich first line, weave in relevant search keywords naturally, and avoid keyword stuffing.',
      );
    }

    return notes.join(' ');
  }

  private fallbackDraft(task: AiTask, input: AiGenerationDto): string {
    const platform = input.platform ?? 'social';
    const business = input.clientName;
    const title = input.contentTitle;
    const taglish = input.language === 'TAGLISH';

    if (task === 'hashtags') {
      return [
        'brand',
        'localbusiness',
        input.industry,
        input.contentType,
        platform,
        'marketing',
        'promo',
      ]
        .filter(Boolean)
        .map((tag) => `#${String(tag).replace(/\s+/g, '').toLowerCase()}`)
        .join(', ');
    }

    if (task === 'tags') {
      return ['draft', input.contentType, input.industry, platform, 'pxl']
        .filter(Boolean)
        .map((tag) => String(tag).replace(/\s+/g, '-').toLowerCase())
        .join(', ');
    }

    if (task === 'broll') {
      return `1. Wide establishing shot of ${business}.\n2. Close-up of the main offer for ${title}.\n3. Hands-on detail / product in use.\n4. Happy customer reaction.\n5. Behind-the-scenes prep moment.\n6. Logo / signage outro shot.`;
    }

    if (task === 'overlay') {
      return `Scene 1: Meet ${business}\nScene 2: ${title}\nScene 3: Here's why it works\nScene 4: See the difference\nScene 5: Message us today`;
    }

    if (task === 'reel-script') {
      return `Hook: Need a quick reason to check out ${business}?\nScene 1: Show the main offer for ${title}.\nScene 2: Highlight the benefit in one clear line.\nScene 3: Add proof, product detail, or customer moment.\nCTA: Message ${business} today or visit the page for details.`;
    }

    if (task === 'template') {
      return `Hook: [Attention-grabbing opener about ${title}]\nBody: [Explain the offer/value for ${business}]\nProof: [Testimonial, result, or detail]\nCTA: [Action — message, visit, or book]`;
    }

    if (task === 'brief') {
      return `Objective: Create ${platform} content for ${business} about ${title}.\nAudience: Current and potential customers.\nMessage: Make the offer clear, useful, and easy to act on.\nAssets: Brand visuals, product/service shots, logo, and CTA.\nReview: Confirm accuracy, tone, platform fit, and final approval before publishing.`;
    }

    if (taglish) {
      return `Option 1: Dito na sa ${business}! Check out ${title} — useful, timely, at sulit. Message mo kami today para sa details.\n\nOption 2: Looking for something new? Sa ${business}, ${title} ang sagot. Send us a message para malaman mo pa!`;
    }

    return `Option 1: ${title} is here for ${business}. Discover what makes it useful, timely, and worth checking out. Message us today to learn more.\n\nOption 2: Looking for something new from ${business}? ${title} gives you a simple reason to take action today. Send us a message for details.`;
  }

  private async callModel(
    system: string,
    user: string,
    temperature: number,
    fallback: () => string,
  ): Promise<AiGenerationResponseDto> {
    const provider = this.config.get('AI_PROVIDER', { infer: true });
    const apiKey =
      provider === 'openai'
        ? this.config.get('OPENAI_API_KEY', { infer: true })
        : this.config.get('GROQ_API_KEY', { infer: true });

    // Deterministic, human-reviewed fallback when no AI provider is configured.
    if (!apiKey || provider === 'ollama') {
      return { provider, model: 'fallback', output: fallback() };
    }

    const model =
      this.config.get('AI_MODEL', { infer: true }) ??
      (provider === 'openai' ? 'gpt-4o-mini' : 'llama-3.1-8b-instant');
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
          temperature,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        return { provider, model: 'fallback', output: fallback() };
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const output = data.choices?.[0]?.message?.content?.trim() || fallback();

      return { provider, model, output };
    } catch {
      return { provider, model: 'fallback', output: fallback() };
    }
  }
}
