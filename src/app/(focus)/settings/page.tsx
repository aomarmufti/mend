"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { btnSecondary, Card } from "@/components/ui/kit";
import { useConsent } from "@/lib/consent";
import { setPrefs, usePrefs } from "@/lib/prefs";

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

function downloadData() {
  const out: Record<string, unknown> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(KEYS_PREFIX)) {
        const raw = window.localStorage.getItem(k) ?? "";
        try {
          out[k] = JSON.parse(raw);
        } catch {
          out[k] = raw;
        }
      }
    }
  } catch {
    /* storage unavailable */
  }
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: out }, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "reknit-my-data.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-xs text-ink/60">{hint}</span>}
      </span>
      <span className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition ${on ? "bg-mint-deep" : "bg-ink/20"}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const prefs = usePrefs();
  const consent = useConsent();

  const wipe = (message: string) => {
    if (window.confirm(message)) {
      deleteAll();
      router.replace("/welcome");
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-12 font-sans text-ink">
      <Link href="/today" className="text-sm font-bold text-ink/60">
        ← Back
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold">Settings</h1>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-lg font-extrabold">Coach</h2>
        <div className="divide-y divide-ink/10">
          <Toggle label="Spoken cues" hint="The coach talks you through each hold" on={prefs.voice} onChange={(v) => setPrefs({ voice: v })} />
          <Toggle label="Chimes and countdown beeps" on={prefs.sound} onChange={(v) => setPrefs({ sound: v })} />
          <Toggle label="Vibration" on={prefs.haptics} onChange={(v) => setPrefs({ haptics: v })} />
        </div>
        <label className="mt-2 block text-sm font-bold" htmlFor="speed">
          Voice speed
        </label>
        <input
          id="speed"
          type="range"
          min={0.8}
          max={1.3}
          step={0.1}
          value={prefs.voiceSpeed}
          onChange={(e) => setPrefs({ voiceSpeed: Number(e.target.value) })}
          className="mt-1 w-full accent-[#2FA67F]"
        />
        <div className="flex justify-between text-xs text-ink/60">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="font-display text-lg font-extrabold">Your data</h2>
        <p className="mt-2 text-sm text-ink/70">
          Everything stays on this device. The camera is never recorded.
          {consent && ` You agreed to health data use on ${new Date(consent.at).toLocaleDateString("en-GB")}.`}
        </p>
        <p className="mt-3 text-sm">
          <Link href="/privacy" className="font-bold underline">
            Privacy policy
          </Link>
          {" · "}
          <Link href="/terms" className="font-bold underline">
            Terms of use
          </Link>
        </p>
        <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={downloadData}>
          Download my data
        </button>
        <Link href="/report" className={`${btnSecondary} mt-2.5 block w-full text-center`}>
          Progress report for a clinician
        </Link>
        <button
          type="button"
          className={`${btnSecondary} mt-2.5 w-full`}
          onClick={() => wipe("Withdraw consent? Reknit will stop using your health data and delete everything stored on this device.")}
        >
          Withdraw consent
        </button>
        <button
          type="button"
          className={`${btnSecondary} mt-2.5 w-full`}
          onClick={() => wipe("Delete all your Reknit data from this device? This cannot be undone.")}
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
