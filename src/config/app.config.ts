import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  AI_PROVIDER: z.enum(['groq', 'openai', 'ollama']).default('groq'),
  AI_MODEL: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  META_GRAPH_API_VERSION: z.string().default('v25.0'),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_LOGIN_CONFIG_ID: z.string().optional(),
  META_OAUTH_REDIRECT_URI: z.string().url().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  SOCIAL_TOKEN_ENCRYPTION_KEY: z.string().optional(),
  N8N_WEBHOOK_BASE_URL: z.string().optional(),
  N8N_CLIENT_CREATED_WEBHOOK_URL: z.string().optional(),
  N8N_CONTENT_SCHEDULED_WEBHOOK_URL: z.string().optional(),
  N8N_LEAD_CREATED_WEBHOOK_URL: z.string().optional(),
  AUTOMATION_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_DRIVE_CLIENT_EMAIL: z.string().email().optional(),
  GOOGLE_DRIVE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_DRIVE_CLIENT_ID: z.string().optional(),
  GOOGLE_DRIVE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_DRIVE_REFRESH_TOKEN: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

export function validateConfig(config: Record<string, unknown>): AppConfig {
  const parsed = configSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  return parsed.data;
}
