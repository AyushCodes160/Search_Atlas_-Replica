"use client";

import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

function SignInInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const error = params.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-paper">
      <div className="dotted-card p-8 sm:p-10 max-w-md w-full relative">
        <span className="font-hand text-clay text-[18px] absolute -top-3 left-6 bg-paper-50 px-2">
          ~ sign in ~
        </span>

        <Link href="/" className="flex items-center gap-2.5 mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-paper border border-ink/20 shadow-sm">
            <Logo />
          </span>
          <span className="font-hand text-[24px] leading-none mt-1">GoToSEO</span>
        </Link>

        <h1 className="font-hand text-[30px] text-ink leading-tight mb-2">
          Save your work.
        </h1>
        <p className="font-sans text-[13.5px] text-ink-soft leading-relaxed mb-6">
          The tools are free to use without an account. Sign in to keep your audit
          history, saved keyword lists, and site crawls — synced across devices.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-md border-2 border-sunset/50 bg-sunset/10 font-sans text-[13px] text-sunset">
            Sign-in failed ({error}). Try again.
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full inline-flex items-center justify-center gap-3 rounded-full px-6 py-3 font-hand text-[19px] bg-paper border border-ink/20 shadow-md hover:-translate-y-0.5 transition-transform"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <p className="font-sans text-[11.5px] text-ink-soft mt-6 text-center leading-relaxed">
          We only read your name, email, and avatar. No posting, no scopes beyond sign-in.
        </p>

        <Link
          href="/app/dashboard"
          className="block text-center font-hand text-[15px] text-ink-soft hover:text-teal-accent mt-4"
        >
          skip — keep using it without an account →
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
