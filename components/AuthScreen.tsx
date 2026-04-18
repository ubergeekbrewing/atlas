"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function AuthScreen({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("sending");
    setMessage("");
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your email for the sign-in link.");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 pb-24 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">ATLAS</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sign in to sync</h1>
        <p className="mt-2 max-w-sm text-base text-zinc-600 dark:text-zinc-400">
          We&apos;ll email you a magic link. Your meals and workouts are saved to your account.
        </p>
      </div>

      <form
        onSubmit={sendLink}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending"}
          className="min-h-12 w-full rounded-xl bg-teal-600 py-3 text-base font-semibold text-white disabled:opacity-60 dark:bg-teal-500"
        >
          {status === "sending" ? "Sending…" : "Email me a link"}
        </button>
        {message ? (
          <p
            className={`text-center text-sm ${status === "error" ? "text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
