import { z } from "zod";
import { Payment } from "@ailo/core";

export const SquareUpResponse = z.object({
  checked_count: z.number().int(),
  breaks_count: z.number().int(),
  needs_review: z.array(Payment),
  status: z.enum(["clean", "breaks_found"]),
});
export type SquareUpResponse = z.infer<typeof SquareUpResponse>;
