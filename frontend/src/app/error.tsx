"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/api";

// Shown instead of a blank page when a screen crashes; the error also goes to the server log.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reportClientError(error.message, error.stack);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold text-[#083174]">Something went wrong</h1>
      <p className="text-sm text-slate-500">The problem has been logged. Please try again.</p>
      <button onClick={reset} className="rounded-xl bg-[#083174] px-5 py-2.5 text-sm font-bold text-white">
        Try again
      </button>
    </div>
  );
}
