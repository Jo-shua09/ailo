import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal, Bot, ShieldCheck, Bell, ReceiptText, ArrowRight, Check, CirclePause, ShoppingBag, CircleDollarSign } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "How Ailo works",
  description: "From your spending rule to the final receipt, see how Ailo helps your AI shop within your boundaries.",
};

export default function HowItWorks() {
  return (
    <div className="site-container marketing-section">
      <p className="section-label mb-4">FROM YOUR WORDS TO YOUR NEXT RESTOCK</p>
      <h1 className="section-title max-w-3xl">
        A little freedom for your AI.
        <br />
        <span className="font-serif font-normal italic text-primary">Clear boundaries for every purchase.</span>
      </h1>
      <p className="mb-12 mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Ailo sits between your assistant and its purchases. You set the rules once. Every payment is checked before it goes anywhere.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          [
            SlidersHorizontal,
            "1. You set the rules",
            "Choose an allowance, the things your assistant can buy, and the amount that needs your approval.",
          ],
          [Bot, "2. Your assistant shops", "It can request a purchase at an approved supplier, with a reason for what it wants to buy."],
          [
            ShieldCheck,
            "3. Ailo checks the request",
            "The amount, supplier and shopping purpose are checked. An unusual purchase gets a second look.",
          ],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Bot;
          return (
            <section key={t as string} className="rounded-md border border-border bg-card p-7">
              <I className="mb-6 h-8 w-8 text-primary" />
              <h2 className="mb-3 text-xl font-semibold">{t as string}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{d as string}</p>
            </section>
          );
        })}
      </div>
      <div className="my-12 grid gap-8 border-y border-border py-10 md:grid-cols-2">
        <section>
          <Bell className="mb-5 h-8 w-8 text-warning" />
          <h2 className="text-2xl font-semibold">Big decisions still belong to you.</h2>
          <p className="mb-5 mt-4 text-muted-foreground">
            A ₦12,000 weekend order is above the sample ₦10,000 limit. Your assistant waits for your nod. Approve it, deny it, or take a closer look.
          </p>
          <Button asChild variant="outline">
            <Link href="/nod">
              Try an approval <ArrowRight />
            </Link>
          </Button>
        </section>
        <section>
          <ReceiptText className="mb-5 h-8 w-8 text-primary" />
          <h2 className="text-2xl font-semibold">Nothing disappears into a black box.</h2>
          <p className="mb-5 mt-4 text-muted-foreground">
            Open any purchase to see the reason, the spending checks and its payment confirmation. You get a receipt for blocked requests too.
          </p>
          <Button asChild variant="outline">
            <Link href="/ledger">
              Explore your receipts <ArrowRight />
            </Link>
          </Button>
        </section>
      </div>
      <h2 className="section-title mb-4">Small tools. One safer experience.</h2>
      <p className="mb-8 text-muted-foreground">These product tools work together in the sample workspace. Every payment here is simulated.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Bot, "Badge", "Your assistant’s own identity."],
          [SlidersHorizontal, "Spec Gate", "Your words become spending boundaries."],
          [ShieldCheck, "Second Look", "Unusual purchases get reviewed."],
          [Bell, "Nod", "You approve bigger purchases."],
          [CirclePause, "Brake", "Stop spending instantly."],
          [ShoppingBag, "Till", "Checkout at participating shops."],
          [ReceiptText, "Receipt", "The story behind every request."],
          [CircleDollarSign, "Square Up", "Match purchases to payment records."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Bot;
          return (
            <div key={t as string} className="rounded-md border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <I className="h-6 w-6 text-primary" />
                <span className="font-mono text-[9px] text-muted-foreground">SIMULATED</span>
              </div>
              <h3 className="font-semibold">{t as string}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d as string}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-12 border-t border-border pt-8">
        <h2 className="text-2xl font-semibold">What’s next for Ailo?</h2>
        <p className="mb-6 mt-3 text-muted-foreground">Ideas we’re exploring, not features you can use today.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Delivery protection", "Reserve payments until your order arrives."],
            ["More ways to approve", "Give your nod through WhatsApp or USSD."],
            ["More financial partners", "Connect more shops, banks and payment options."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-dashed border-border p-5">
              <span className="font-mono text-[10px] text-muted-foreground">NEXT</span>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
      <Button asChild size="lg" className="mt-10">
        <Link href="/dashboard">
          See Ailo in action <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
