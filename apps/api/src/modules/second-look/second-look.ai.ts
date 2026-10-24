import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { SecondLookResult } from "@ailo/core";
import type { SecondLookDeps } from "./second-look.service";

const PROVIDERS = { google, openai, anthropic };

// Real model adapter for secondLook. Not wired in yet.
export function createDecider(env: { LLM_PROVIDER: keyof typeof PROVIDERS; LLM_MODEL_FAST: string }): SecondLookDeps["decide"] {
  const model = PROVIDERS[env.LLM_PROVIDER](env.LLM_MODEL_FAST);
  return async (prompt, signal) => {
    const { output } = await generateText({
      model,
      prompt,
      output: Output.object({ schema: SecondLookResult }),
      // A retry would blow the deadline; the caller escalates instead.
      maxRetries: 0,
      abortSignal: signal,
    });
    return output;
  };
}
