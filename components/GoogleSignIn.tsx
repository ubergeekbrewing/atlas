"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";

export default function GoogleSignIn({ supabase }: { supabase: SupabaseClient }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function continueWithGoogle() {
    setErr(null);
    setBusy(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setBusy(false);
      setErr(error.message);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-zinc-950 px-4 py-10">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-teal-500">ATLAS</p>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-50">Sign in to continue</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
          Your meals, workouts, and labs are stored in your Supabase account. Use Google to sign in.
        </p>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl">
        {err ? (
          <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200" role="alert">
            {err}
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void continueWithGoogle()}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-600 bg-white px-4 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 disabled:opacity-60"
        >
          <GoogleGlyph />
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.86 11.86 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
