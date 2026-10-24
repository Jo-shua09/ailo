import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      PUBLIC_BASE_URL: "http://localhost:4000",
      MONGODB_URI: "mongodb://localhost:27017/ailo_test",
      DATABASE_URL: "mongodb://localhost:27017/ailo_test",
      KORA_MODE: "test",
      KORA_BASE_URL: "https://api.korapay.com/merchant/api/v1",
      KORA_SECRET_KEY: "test_kora_secret_key",
      LLM_MODEL_FAST: "gemini-3.5-flash-lite",
      LLM_MODEL_SMART: "gemini-3.8-flash",
      OWNER_PIN: "123456",
      SESSION_SECRET: "1234567890123456",
      CONSOLE_ORIGIN: "http://localhost:3000",
    },
  },
});
