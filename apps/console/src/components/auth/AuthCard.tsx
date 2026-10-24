"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Shield } from "lucide-react";
import { AiloBrand } from "@/src/components/dashboard/AiloLogo";
import { signIn } from "@/src/lib/api";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function AuthCard({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();


  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await signIn(pin);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full min-h-screen h-screen grid grid-cols-1 lg:grid-cols-2 bg-white antialiased overflow-hidden select-none">
      {/* Left Column: White Auth Panel (Full Height & Responsive Width) */}
      <div className="w-full h-full flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 overflow-y-auto bg-white">
        {/* Brand logo top left */}
        <div>
          <Link href="/login" className="inline-block">
            <AiloBrand theme="light" />
          </Link>
        </div>

        {/* Auth Body - Centered Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-6 sm:py-10">
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-slate-900 tracking-tight">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
            {mode === "login"
              ? "Sign in to manage your AI agents and allowances."
              : "Sign up to give your AI assistants safe, audited allowances."}
          </p>

          {!showEmailForm ? (
            /* Main Auth Options as shown in reference */
            <div className="mt-8 space-y-3.5">
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="w-full rounded-xl bg-[#0c1017] hover:bg-[#1a2332] text-white py-3.5 px-4 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all duration-150 active:scale-99"
              >
                <Mail className="h-4 w-4" />
                <span>
                  {mode === "login" ? "Continue with Email" : "Sign up with Email"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setError("Google sign-in is not connected yet. Use your owner PIN."); setShowEmailForm(true); }}
                disabled={busy}
                className="w-full rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 py-3.5 px-4 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs transition-all duration-150 active:scale-99"
              >
                <GoogleIcon />
                <span>
                  {mode === "login" ? "Continue with Google" : "Sign up with Google"}
                </span>
              </button>

              {/* Mode switch link */}
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError("");
                  }}
                  className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  {mode === "login"
                    ? "Create an account"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          ) : (
            /* Email / PIN Form */
            <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@business.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner PIN / Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your owner PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-600 font-medium">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[#0c1017] hover:bg-[#1a2332] text-white py-3.5 px-4 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-99"
              >
                <span>{busy ? "Opening workspace..." : "Continue to dashboard"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 pt-1"
              >
                ← Back to options
              </button>
            </form>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-400 font-medium select-none">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>Secure</span>
          <span>•</span>
          <span>Encrypted</span>
          <span>•</span>
          <span>Built for Nigeria</span>
        </div>
      </div>

      {/* Right Column: Dark Emerald Gradient with 3D Robot Mascot (Full Width & Height) */}
      <div className="hidden lg:flex w-full h-full relative bg-[#061412] flex-col justify-between p-12 lg:p-16 xl:p-20 overflow-hidden text-white">
        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-teal-500/15 blur-3xl pointer-events-none"
        />

        {/* Top Text Content */}
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
            More control.
            <br />
            More possibilities.
          </h2>
          <p className="mt-4 text-sm xl:text-base text-emerald-100/75 font-normal leading-relaxed max-w-md">
            Give your AI agents the right permissions, set spending limits, and
            track every transaction.
          </p>
        </div>

        {/* Mascot Centerpiece */}
        <div className="relative z-10 flex-1 flex items-center justify-center my-4 w-full">
          <div className="relative w-full max-w-[420px] xl:max-w-[480px] aspect-square rounded-3xl overflow-hidden shadow-2xl ring-1 ring-emerald-500/20 bg-radial from-emerald-900/40 via-emerald-950/20 to-transparent">
            <Image
              src="/images/login-mascot.jpg"
              alt="Ailo AI agent robot mascot with shield and security tiles"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
