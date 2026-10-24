import { z } from "zod";
import { ApprovalRequest } from "@ailo/core";

export const ApprovalDecisionInput = z.object({
  decision: z.enum(["approve", "deny"]),
});
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionInput>;

export const ApprovalRecordSchema = ApprovalRequest.extend({
  status: z.enum(["pending", "approved", "denied", "expired"]),
  created_at: z.string(),
  decided_at: z.string().nullable().optional(),
  auth_cap_kobo: z.number().int().optional(),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;
