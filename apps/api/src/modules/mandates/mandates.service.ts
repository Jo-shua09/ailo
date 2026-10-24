import { evaluatePolicy, SpendPolicy } from "@ailo/core";
import { AppError } from "../../shared/AppError";
import { listPayeeIds } from "../payees/payees";
import { paymentsRepository } from "../payments/payments.repository";
import type { Mandate } from "./mandates.dto";
import { mandatesRepository } from "./mandates.repository";

export type GeneratePolicy = (english: string) => Promise<unknown>;

const readableIssues = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
  error.issues.map((i) => `${i.path.map(String).join(".") || "policy"}: ${i.message}`);

/** The model only proposes; this zod check decides whether the proposal is a usable rule. */
export async function compile(english: string, deps: { generatePolicy: GeneratePolicy }): Promise<SpendPolicy> {
  const parsed = SpendPolicy.safeParse(await deps.generatePolicy(english));
  if (!parsed.success) {
    throw new AppError(422, "COMPILE_FAILED", "Could not turn that rule into a valid policy. Try rewording it.", readableIssues(parsed.error));
  }
  // A rule naming no shops means "my usual shops" (owner's decision, 24 Oct): fill them in here so the
  // owner sees the list in the compiled rule before saving, instead of every payment needing a Nod.
  // The model sometimes writes a shop's name ("Mama Samuel") instead of an id; an unknown entry would send
  // every payment to Nod, so only ids in the payee directory are kept.
  const known = listPayeeIds();
  const payees = parsed.data.allowed_payees.filter((id) => known.includes(id));
  return { ...parsed.data, allowed_payees: payees.length ? payees : known };
}

const DAY_MS = 24 * 3600 * 1000;

/** Replays recent payments against a draft rule (Radar "Test"). Nothing is saved or enforced. */
export async function test(policy: SpendPolicy, opts: { limit: number }) {
  const history = (await paymentsRepository.listPayments()).slice(0, opts.limit).reverse();
  const counted: { at: number; payee_id: string; amount_kobo: number }[] = [];
  const totals = { allow: 0, nod: 0, block: 0 };

  const results = history.map((p) => {
    const at = new Date(p.created_at).getTime();
    const sum = (ms: number, payee?: string) => counted
      .filter((c) => at - c.at < ms && (!payee || c.payee_id === payee))
      .reduce((s, c) => s + c.amount_kobo, 0);
    // Assumption: earlier payments in this list count as spent unless this rule would block them, using
    // rolling 24h / 7 day windows like payments.repository (not calendar days).
    const decision = evaluatePolicy(policy, p, {
      now: new Date(at),
      spent_today_kobo: sum(DAY_MS),
      spent_this_week_kobo: sum(7 * DAY_MS),
      payee_spent_24h_kobo: sum(DAY_MS, p.payee_id),
    });
    if (decision.verdict !== "block") counted.push({ at, payee_id: p.payee_id, amount_kobo: p.amount_kobo });
    totals[decision.verdict]++;
    return {
      payment_id: p.id, amount_kobo: p.amount_kobo, payee_id: p.payee_id, category: p.category,
      verdict: decision.verdict, reasons: decision.reasons,
    };
  });

  return { results, totals };
}

export async function save(english: string, policy: unknown): Promise<Mandate> {
  const parsed = SpendPolicy.safeParse(policy);
  if (!parsed.success) throw new AppError(400, "VALIDATION_FAILED", "Policy is invalid", readableIssues(parsed.error));
  return mandatesRepository.save(english, parsed.data);
}

export function current(): Promise<Mandate | undefined> {
  return mandatesRepository.latest();
}

export function list(): Promise<Mandate[]> {
  return mandatesRepository.list();
}
