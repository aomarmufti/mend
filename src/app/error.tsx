"use client";

import { useEffect } from "react";
import { btnPrimary } from "@/components/ui/kit";
import { reportError } from "@/lib/reportError";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center font-sans text-ink">
      <h1 className="font-display text-2xl font-extrabold">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink/70">Your data is safe on this device. Try again, and if it keeps happening, reload the page.</p>
      <button type="button" onClick={reset} className={`${btnPrimary} mt-6`}>
        Try again
      </button>
    </main>
  );
}
