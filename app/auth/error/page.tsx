import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Sign-in link problem</h1>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        That link may be expired or invalid. Request a new sign-in email from ATLAS.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-500"
      >
        Back to ATLAS
      </Link>
    </div>
  );
}
