import { z } from "zod";

// Validated once at boot so a missing key fails loudly at startup, not mid-payment.
const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  PUBLIC_BASE_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  KORA_MODE: z.enum(["test", "live"]).default("test"),
  KORA_BASE_URL: z.url(),
  KORA_SECRET_KEY: z.string().min(1),
  KORA_WEBHOOK_PATH: z.string().default("/v1/webhooks/kora"),
  LLM_PROVIDER: z.enum(["google", "openai", "anthropic"]).default("google"),
  LLM_MODEL_FAST: z.string().min(1),
  LLM_MODEL_SMART: z.string().min(1),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(1800),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OWNER_PIN: z.string().min(6),
  SESSION_SECRET: z.string().min(16),
  CONSOLE_ORIGIN: z.url().default("http://localhost:3000"),
});

export const env = Env.parse(process.env);

// The Vercel AI SDK's Google provider reads this name, not GEMINI_API_KEY.
if (env.GEMINI_API_KEY) process.env.GOOGLE_GENERATIVE_AI_API_KEY ??= env.GEMINI_API_KEY;
