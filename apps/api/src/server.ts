import { createApp } from "./app";
import { env } from "./config/env";

createApp({ ownerPin: env.OWNER_PIN, sessionSecret: env.SESSION_SECRET }).listen(env.PORT, () => {
  console.log(`Ailo API on :${env.PORT} (Kora ${env.KORA_MODE}, LLM ${env.LLM_PROVIDER})`);
});
