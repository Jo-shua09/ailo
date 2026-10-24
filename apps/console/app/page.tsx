import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ShieldCheck,
  SlidersHorizontal,
  Bell,
  CirclePause,
  ReceiptText,
  ShoppingBag,
  Bot,
  ChevronRight,
} from "lucide-react";
import ownerImage from "@/assets/ailo-owner.jpg";
import groceriesImage from "@/assets/grocery-stock.jpg";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "An allowance for your AI",
  description:
    "Give your AI an allowance, not your bank login. Ailo helps Nigerian business owners delegate purchases with clear limits, approvals and receipts.",
};

export default function LandingPage() {
  return (
    <div>
      <section className="marketing-hero">
        <img src={ownerImage.src} alt="A shop owner checking her phone in her bright Lagos grocery store" width={1920} height={1024} />
        <div className="site-container hero-content">
          <div className="mb-6 flex items-center gap-2 text-xs font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" /> A LITTLE AI. A LOT MORE CONTROL.
          </div>
          <h1 className="hero-title">
            Give your AI an
            <br />
            allowance.
            <br />
            <span className="font-serif font-normal italic text-primary">Not your bank login.</span>
          </h1>
          <p className="mb-7 mt-6 max-w-[410px] text-base leading-relaxed text-muted-foreground">
            Meet Ailo. Let your AI handle everyday purchases, while you decide the budget, the boundaries, and the big decisions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Try Ailo for yourself <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/ecosystem">
                See how it works <ArrowRight />
              </Link>
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5" /> No bank login shared. No real money in this demo.
          </p>
        </div>
        <div className="hero-quote">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-soft text-success">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Your business. Your rules.</p>
              <p className="mt-1 text-xs text-muted-foreground">Every purchase stays within your allowance.</p>
            </div>
          </div>
        </div>
      </section>
      <div className="border-b border-border bg-card">
        <div className="site-container grid grid-cols-1 gap-4 py-5 text-sm font-medium sm:grid-cols-3 sm:py-6">
          {[
            [ShieldCheck, "Your bank details stay yours"],
            [SlidersHorizontal, "Spending limits you set"],
            [Bell, "Big purchases need your nod"],
          ].map(([Icon, text], i) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={i} className="flex items-center justify-center gap-3">
                <I className="h-5 w-5 text-primary" />
                {text as string}
              </div>
            );
          })}
        </div>
      </div>
      <section className="marketing-section bg-card">
        <div className="site-container">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:mb-12 md:flex-row md:items-end">
            <div>
              <p className="section-label mb-4">LESS BUSYWORK. MORE BUSINESS.</p>
              <h2 className="section-title">
                An extra pair of hands.
                <br />
                <span className="font-serif font-normal italic text-primary">Not an open wallet.</span>
              </h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              Your assistant can restock supplies and take care of routine purchases. Ailo makes sure it only spends on what you actually asked for.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: SlidersHorizontal,
                n: "01",
                title: "Set your allowance",
                text: "Tell Ailo what your assistant can buy, where it can shop, and how much it can spend. In your own words.",
              },
              {
                icon: Bot,
                n: "02",
                title: "Let your AI get to work",
                text: "Routine purchases go through when they fit your rules. Anything unusual gets a second look before a naira moves.",
              },
              {
                icon: Bell,
                n: "03",
                title: "Stay in the loop",
                text: "Larger purchases come to you for approval. Every payment has a clear receipt, and you can stop spending anytime.",
              },
            ].map((c) => (
              <div key={c.n} className="border-t border-border pt-6">
                <div className="mb-6 flex justify-between">
                  <c.icon className="h-7 w-7 text-primary" />
                  <span className="font-mono text-sm text-muted-foreground">{c.n}</span>
                </div>
                <h3 className="mb-3 text-xl font-semibold">{c.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="marketing-section">
        <div className="site-container grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="section-label mb-4">SIMPLE ENOUGH TO SAY OUT LOUD</p>
            <h2 className="section-title">
              Your rules.
              <br />
              <span className="font-serif font-normal italic text-primary">In your own words.</span>
            </h2>
            <p className="mb-7 mt-5 max-w-md leading-relaxed text-muted-foreground">
              You don’t need to speak tech to stay in control. Write a spending rule like you’d explain it to someone helping at your shop.
            </p>
            <blockquote className="border-l-2 border-primary pl-5 font-serif text-3xl leading-snug">
              “My shop agent can spend ₦50,000 a week on stock. Ask me above ₦10,000.”
            </blockquote>
            <Button asChild variant="link" className="mt-6 px-0">
              <Link href="/rules">
                Make your first spending rule <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex justify-between border-b border-border p-6">
              <span className="font-semibold">Shop assistant’s allowance</span>
              <span className="status-pill bg-success-soft text-success">
                <Check className="h-3 w-3" /> Active
              </span>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Weekly spending limit</p>
              <p className="my-3 font-mono text-4xl font-medium">
                ₦50,000<span className="text-lg text-muted-foreground">.00</span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[17%] bg-primary" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">₦8,500 spent · ₦41,500 still available</p>
              <dl className="mt-7 divide-y divide-border text-sm">
                {[
                  ["Can buy", "Groceries & shop stock"],
                  ["Can shop at", "Approved suppliers"],
                  ["Ask me first", "Above ₦10,000"],
                  ["You’re in charge", "Pause at any time"],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-wrap justify-between gap-2 py-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <span className="font-mono text-[10px] text-muted-foreground">SIMULATED ALLOWANCE</span>
            </div>
          </div>
        </div>
      </section>
      <section className="marketing-section bg-card">
        <div className="site-container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="section-label mb-4">INDEPENDENCE, WITH BOUNDARIES</p>
            <h2 className="section-title">
              A smarter assistant.
              <br />A safer way to spend.
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              From the first request to the final receipt, you’re never left wondering where your money went.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [ShieldCheck, "A second look", "Unusual requests are checked against what you actually wanted to buy."],
              [Bell, "A nod from you", "Approve or deny larger purchases right from your phone."],
              [CirclePause, "An instant brake", "Pause your assistant’s spending whenever something feels wrong."],
              [ReceiptText, "A receipt for everything", "See the amount, the reason and the checks behind each payment."],
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={title as string} className="rounded-md border border-border p-6 sm:p-7">
                  <I className="mb-5 h-7 w-7 text-primary" />
                  <h3 className="mb-3 text-lg font-semibold">{title as string}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{desc as string}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/security">
                Get to know Ailo’s safety checks <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="marketing-section">
        <div className="site-container grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <img
              src={groceriesImage.src}
              alt="Rice, vegetable oil and garri for a shop restock"
              loading="lazy"
              width={1024}
              height={1024}
              className="aspect-[4/3] w-full object-contain"
            />
            <div className="flex items-center justify-between gap-3 border-t border-border p-5">
              <div>
                <p className="font-semibold">Mama Ngozi Stores</p>
                <p className="mt-1 text-sm text-muted-foreground">Your next restock, handled.</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">DEMO SHOP</span>
            </div>
          </div>
          <div>
            <p className="section-label mb-4">BUILT FOR REAL-LIFE BUSINESS</p>
            <h2 className="section-title">
              Keep your shelves full.
              <br />
              <span className="font-serif font-normal italic text-primary">And your day free.</span>
            </h2>
            <p className="mb-6 mt-5 leading-relaxed text-muted-foreground">
              Imagine your assistant ordering rice from your usual supplier, asking before a bigger weekend restock, and blocking an unexpected gift
              hamper. That’s the kind of everyday help Ailo is built for.
            </p>
            <div className="mb-7 space-y-3">
              {[
                "Routine groceries? Within your allowance.",
                "A bigger order? You give the final nod.",
                "An unexpected purchase? Stopped for review.",
              ].map((t) => (
                <p key={t} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-success" />
                  {t}
                </p>
              ))}
            </div>
            <Button asChild size="lg">
              <Link href="/shop">
                Take the demo shop for a spin <ShoppingBag />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="marketing-section border-y border-border bg-card">
        <div className="site-container grid gap-8 md:grid-cols-2 md:gap-10 lg:gap-16">
          <div>
            <p className="section-label mb-4">A FEW GOOD QUESTIONS</p>
            <h2 className="section-title">
              Let’s clear
              <br />
              <span className="font-serif font-normal italic text-primary">things up.</span>
            </h2>
          </div>
          <div className="divide-y divide-border">
            {[
              [
                "Does my AI get my bank login?",
                "No. Your assistant gets its own limited permission to request payments. Your bank login is never shared with it.",
              ],
              [
                "Can I approve purchases myself?",
                "Yes. Set an approval amount and requests above it come to you for a nod. You can approve or deny them.",
              ],
              [
                "Does Ailo hold my money?",
                "Ailo is designed to work with licensed payment partners, rather than hold your money. This demo uses simulated Kora payments only.",
              ],
              ["Is this real money?", "No. This is an interactive demo with sample businesses and purchases. Nothing you do here moves real money."],
            ].map(([q, a]) => (
              <details key={q} className="py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                  {q}
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="marketing-section bg-accent">
        <div className="site-container text-center">
          <p className="section-label mb-4">YOU SET THE LIMITS. AILO HANDLES THE REST.</p>
          <h2 className="section-title">
            Give your AI a little freedom.
            <br />
            <span className="font-serif font-normal italic text-primary">Keep your peace of mind.</span>
          </h2>
          <p className="my-6 text-muted-foreground">Start with a simple rule. See what your assistant can do.</p>
          <Button asChild size="lg">
            <Link href="/dashboard">
              Explore your Ailo workspace <ArrowUpRight />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">Free to explore · Sample data · No real payments</p>
        </div>
      </section>
    </div>
  );
}
