import { z } from "zod";

export const KoraWebhookPayload = z.object({
  event: z.string(),
  data: z.object({
    reference: z.string(),
    status: z.string(),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),
    fee: z.union([z.string(), z.number()]).optional(),
  }),
});
export type KoraWebhookPayload = z.infer<typeof KoraWebhookPayload>;
