import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { SpendPolicy } from "@ailo/core";
import { generateText, Output } from "ai";
import type { GeneratePolicy } from "./mandates.service";

const PROVIDERS = { google, openai, anthropic };

const instructions = (english: string) => `You turn a business owner's spending rule for their AI buying agent into a SpendPolicy.
Rules:
- All amounts are integer kobo. N1 = 100 kobo, so N5,000 = 500000. Never use decimals.
- Categories are lowercase single words or short phrases, e.g. "groceries".
- expires_at is an ISO 8601 UTC datetime. If the owner gives no end date, use 30 days from ${new Date().toISOString()}.
- allowed_payees holds only payee ids the owner explicitly named. Never invent payees; use [] if none were named.
- If the owner gives no approval threshold, set nod_above_kobo and nod_rolling_payee_24h_kobo to the per-payment limit.

Owner's rule:
"""
${english}
"""`;

/** The real model behind Spec Gate. Its output is untrusted: compile() re-validates it with zod. */
export function createPolicyGenerator(env: { LLM_PROVIDER: keyof typeof PROVIDERS; LLM_MODEL_SMART: string }): GeneratePolicy {
  const model = PROVIDERS[env.LLM_PROVIDER](env.LLM_MODEL_SMART);
  return async (english) => {
    const { output } = await generateText({ model, output: Output.object({ schema: SpendPolicy }), prompt: instructions(english) });
    return output;
  };
}
