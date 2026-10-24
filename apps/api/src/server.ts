import { createApp } from "./app";
import { env } from "./config/env";
import { connectMongo } from "./db/mongo";
import { createPolicyGenerator } from "./modules/mandates/mandates.ai";

async function bootstrap() {
  await connectMongo();

  createApp({
    ownerPin: env.OWNER_PIN,
    sessionSecret: env.SESSION_SECRET,
    generatePolicy: createPolicyGenerator(env),
  }).listen(env.PORT, () => {
    console.log(`Ailo API on :${env.PORT} (Kora ${env.KORA_MODE}, LLM ${env.LLM_PROVIDER})`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start Ailo API server:", err);
  process.exit(1);
});
