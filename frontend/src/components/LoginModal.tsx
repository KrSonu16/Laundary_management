"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Waves } from "lucide-react";
import type { StaffUserDto } from "@/lib/types";

interface LoginModalProps {
  onLoginSuccess: (user: StaffUserDto) => void;
}

export function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const result = (await response.json().catch(() => null)) as
        | { user?: StaffUserDto; error?: string }
        | null;

      if (!response.ok || !result?.user) {
        setErrorMessage(
          response.status >= 500
            ? "Sign-in is temporarily unavailable. Please try again shortly."
            : "The account details could not be verified. Check them and try again."
        );
        return;
      }

      onLoginSuccess(result.user);
    } catch {
      setErrorMessage("We could not reach the service. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-linen px-3 py-2 sm:px-6 sm:py-6">
      <div className="mx-auto grid min-h-[calc(100svh-1rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_28px_90px_-45px_rgba(23,40,42,0.35)] sm:min-h-[calc(100svh-3rem)] md:grid-cols-[1.04fr_0.96fr]">
        <section className="relative isolate flex min-h-[250px] flex-col justify-between overflow-hidden bg-ink px-5 py-5 text-white sm:min-h-[300px] sm:px-10 sm:py-10 md:min-h-[calc(100svh-3rem)] md:px-10 md:py-8 lg:px-14 lg:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-28 -top-36 size-[27rem] rounded-full border border-white/10" />
            <div className="absolute -right-12 -top-20 size-[20rem] rounded-full border border-white/10" />
            <div className="absolute -bottom-48 -left-28 size-[32rem] rounded-full bg-sea/30 blur-3xl" />
            <div className="absolute bottom-12 right-12 size-24 rounded-full bg-sun/20 blur-2xl" />
          </div>

          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-sea text-white shadow-lg shadow-black/15">
              <Waves aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">DC Laundry</p>
              <p className="text-xs text-white/60">Operations workspace</p>
            </div>
          </div>

          <div className="relative max-w-lg py-4 sm:py-10 md:py-6 lg:py-10">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 sm:mb-5">
              <span className="size-1.5 rounded-full bg-sun" />
              One calm place for every order
            </p>
            <h1 className="text-balance text-2xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl md:text-4xl lg:text-[3.4rem]">
              Keep the day moving.
              <span className="mt-2 block text-sea-soft">Keep every garment accounted for.</span>
            </h1>
            <p className="mt-4 hidden max-w-md text-sm leading-6 text-white/65 sm:mt-6 sm:block sm:text-base sm:leading-7">
              Track orders from intake to handover, verify garment counts, and keep your team aligned from one secure workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-xs text-white/60">
            <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4 text-sea-soft" /> Staff-only access</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole aria-hidden="true" className="size-4 text-sea-soft" /> Secure sessions</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-7 sm:px-10 md:px-8 md:py-6 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-6 sm:mb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sea">Welcome back</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">Sign in to your workspace</h2>
              <p className="mt-3 text-sm leading-6 text-ink-muted">Use the staff account created for your shop.</p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-ink" htmlFor="staff-identifier">Email or mobile number</label>
                <input
                  autoComplete="username"
                  className="h-12 rounded-xl border border-line bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink-muted/60 focus:border-sea focus:ring-4 focus:ring-sea/10"
                  id="staff-identifier"
                  maxLength={254}
                  name="identifier"
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="name@shop.com or mobile number"
                  required
                  value={identifier}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-ink" htmlFor="staff-password">Password</label>
                  <span className="text-xs text-ink-muted">Contact your administrator if needed</span>
                </div>
                <div className="relative">
                  <input
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-line bg-white px-4 pr-12 text-sm text-ink outline-none transition placeholder:text-ink-muted/60 focus:border-sea focus:ring-4 focus:ring-sea/10"
                    id="staff-password"
                    maxLength={512}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-sea"
                    onClick={() => setShowPassword((value) => !value)}
                    type="button"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sea px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sea-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || !identifier.trim() || !password}
                type="submit"
              >
                {isSubmitting ? "Signing in…" : "Sign in securely"}
                {!isSubmitting && <ArrowRight aria-hidden="true" className="size-4" />}
              </button>
            </form>

            <p className="mt-8 border-t border-line pt-5 text-xs leading-5 text-ink-muted">
              Access is limited to authorised staff. Sessions are protected with server-side expiry; sign out at any time.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
