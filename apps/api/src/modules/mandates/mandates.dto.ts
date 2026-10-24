import { z } from "zod";
import { SpendPolicy } from "@ailo/core";

const English = z.string().trim().min(1).max(2000);

export const CompileMandate = z.object({ english: English });
export const TestMandate = z.object({ policy: SpendPolicy, limit: z.number().int().min(1).max(100).default(20) });
export const SaveMandate = z.object({ english: English, policy: SpendPolicy });

// A type (not an interface) so it satisfies the MongoDB Document constraint in getCollection<T>.
export type Mandate = {
  version: number;
  english_rule: string;
  policy: SpendPolicy;
  created_at: string;
};
