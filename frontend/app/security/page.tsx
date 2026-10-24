import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, SlidersHorizontal, Bell, PauseCircle, Check, ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "Your money, protected",
  description: "Understand Ailo’s spending limits, second-look checks, owner approvals and instant spending pause.",
};

export default function Safety() {
  return (
    <div className="site-container marketing-section">
      <p className="section-label mb-4">CONFIDENCE, NOT BLIND TRUST</p>
      <h1 className="section-title">
        An assistant you can delegate to.
        <br />
        <span className="font-serif font-normal italic text-primary">Boundaries you can count on.</span>
      </h1>
      <p className="my-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        AI can make mistakes. Ailo is designed to keep those mistakes from becoming unexpected purchases. You stay in charge of what can be spent, and
        when.
      </p>
      <div className="my-10 grid gap-6 sm:grid-cols-2">
        {[
          [
            LockKeyhole,
            "Your login stays private",
            "Your assistant has its own limited identity. It does not need your bank password to request a purchase.",
          ],
          [
            SlidersHorizontal,
            "A real spending boundary",
            "Your weekly allowance, approved suppliers and purchase categories are checked before a request can go through.",
          ],
          [
            ShieldCheck,
            "The purpose matters too",
            "A request can be under budget and still be wrong. A second look checks whether the purchase matches your business goal.",
          ],
          [Bell, "You have the final nod", "Above your approval limit, a request waits for you. Your assistant cannot give its own approval."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <section key={t as string} className="rounded-md border border-border bg-card p-7">
              <I className="mb-5 h-8 w-8 text-primary" />
              <h2 className="text-xl font-semibold">{t as string}</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">{d as string}</p>
            </section>
          );
        })}
      </div>
      <section className="grid gap-8 border-y border-border py-10 md:grid-cols-2">
        <div>
          <p className="section-label mb-4">A REQUEST THAT DIDN’T FIT</p>
          <h2 className="text-3xl font-semibold">A gift hamper isn’t shop stock.</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            In our sample shop, hidden instructions try to make the assistant buy a ₦9,000 gift hamper instead of groceries. The shop is allowed and
            the amount is under the limit — but the purpose is wrong.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/shop">
              Explore the sample shop <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="rounded-md border border-border bg-card p-7">
          <span className="status-pill bg-destructive-soft text-destructive">Blocked · SIMULATED</span>
          <h3 className="mb-5 mt-5 text-xl font-semibold">Unexpected gift hamper</h3>
          <p className="font-mono text-3xl">₦9,000.00</p>
          <p className="my-5 flex items-center gap-2 text-sm text-success">
            <Check className="h-4 w-4" /> Shop and amount: allowed
          </p>
          <p className="border-l-2 border-destructive pl-4 text-sm leading-relaxed text-destructive">
            Second look: this item doesn’t match your restock goal. No money moved.
          </p>
        </div>
      </section>
      <div className="py-10">
        <PauseCircle className="mb-5 h-8 w-8 text-destructive" />
        <h2 className="text-3xl font-semibold">And you can always stop everything.</h2>
        <p className="my-5 max-w-2xl leading-relaxed text-muted-foreground">
          Pause your assistant from your workspace. New spending requests are refused immediately. It’s your business, and you never give up the
          controls.
        </p>
        <Button asChild variant="outline">
          <Link href="/agents">
            Meet your assistant <ArrowRight />
          </Link>
        </Button>
      </div>
      <p className="border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
        This is a simulated product demonstration, not a live banking service or a guarantee against every AI mistake. No real money moves, and the
        checks shown use sample data.
      </p>
    </div>
  );
}
