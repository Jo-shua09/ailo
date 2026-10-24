"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { signIn } from "@/src/lib/api";
import { Button } from "@/src/components/ui/button";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(pin);
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="gridlines relative isolate flex flex-1 items-center overflow-hidden px-5 py-12 sm:px-8 lg:py-16">
      <div aria-hidden="true" className="absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-accent opacity-70 blur-3xl" />
      <div className="site-container grid w-full max-w-5xl items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-center padding rounded-xl border border-border">
          <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <p className="section-label">OWNER ACCESS</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter your owner PIN to open your Ailo workspace.</p>
          <form className="mt-8 space-y-5" onSubmit={submit}>
            <div>
              <label htmlFor="owner-pin" className="mb-2 block text-sm font-medium">
                Owner PIN
              </label>
              <input
                id="owner-pin"
                autoComplete="current-password"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="Enter your PIN"
                className="h-12 w-full rounded-sm border border-input bg-background px-3.5 text-sm outline-none transition placeholder:text-dim focus:border-primary focus:ring-2 focus:ring-primary/15"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-sm border border-destructive/20 bg-destructive-soft px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !pin} className="h-12 w-full justify-center gap-2">
              {busy ? "Signing in…" : "Continue to dashboard"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-7 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">Secure owner session</span>
            <br />
            Your PIN is exchanged for a temporary session key over the Ailo API.
          </p>
        </section>
      </div>
    </main>
  );
}
