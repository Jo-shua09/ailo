import { z } from "zod";

// Validated once at boot so a missing key fails loudly at startup, not mid-payment.
const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  PUBLIC_BASE_URL: z.url(),
  DATABASE_URL: z.string().optional(),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/ailo"),
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

const devDefaults = process.env.NODE_ENV !== "production" ? {
  PUBLIC_BASE_URL: "http://localhost:4000",
  MONGODB_URI: "mongodb://localhost:27017/ailo",
  KORA_BASE_URL: "https://api.korapay.com/merchant/api/v1",
  KORA_SECRET_KEY: "test_kora_secret_key",
  LLM_MODEL_FAST: "gemini-3.5-flash-lite",
  LLM_MODEL_SMART: "gemini-3.8-flash",
  OWNER_PIN: "123456",
  SESSION_SECRET: "1234567890123456",
  CONSOLE_ORIGIN: "http://localhost:3000",
} : {};

export const env = Env.parse({ ...devDefaults, ...process.env });

// The Vercel AI SDK's Google provider reads this name, not GEMINI_API_KEY.
if (env.GEMINI_API_KEY) process.env.GOOGLE_GENERATIVE_AI_API_KEY ??= env.GEMINI_API_KEY;
