"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { btnSecondary, Card } from "@/components/ui/kit";

const KEYS_PREFIX = "mend:";

function deleteAll() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(KEYS_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage unavailable: nothing to delete */
  }
}

export default function SettingsPage() {
  const router = useRouter();
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-12 font-sans text-ink">
      <Link href="/today" className="text-sm font-bold text-ink/60">
        ← Back
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold">Settings</h1>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-lg font-extrabold">Your data</h2>
        <p className="mt-2 text-sm text-ink/70">
          Everything stays on this device. The camera is never recorded.
        </p>
        <Link href="/privacy" className="mt-3 inline-block text-sm font-bold underline">
          Read the privacy policy
        </Link>
        <button
          type="button"
          className={`${btnSecondary} mt-4 w-full`}
          onClick={() => {
            if (window.confirm("Delete all your Reknit data from this device? This cannot be undone.")) {
              deleteAll();
              router.replace("/welcome");
            }
          }}
        >
          Delete all my data
        </button>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="font-display text-lg font-extrabold">About</h2>
        <p className="mt-2 text-sm text-ink/70">
          Reknit supports general exercise and is not a substitute for medical advice. Stop if
          anything hurts more than expected.
        </p>
      </Card>
    </main>
  );
}
