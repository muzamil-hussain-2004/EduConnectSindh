import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CLIENT_URL: z.url().default('http://localhost:5173'),

  // 'none' is needed when the frontend and API live on different sites (e.g. Vercel + Render).
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Optional: if both are set, `npm run db:seed` creates this admin account.
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Private verification documents live here (never served statically).
  UPLOAD_DIR: z.string().default('uploads/.private'),

  // Optional: any OpenAI-compatible chat API. Without a key the assistant
  // falls back to a built-in search over the course's own lessons.
  AI_API_KEY: z.string().min(1).optional(),
  AI_BASE_URL: z.url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // The logger is not available yet, so fail fast with a plain message.
    // eslint-disable-next-line no-console
    console.error(`Invalid environment variables:\n${problems}`);
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
