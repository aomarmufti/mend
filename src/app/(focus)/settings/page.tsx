"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { btnSecondary, Card } from "@/components/ui/kit";
import { useConsent } from "@/lib/consent";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { AvatarPreview } from "@/components/AvatarPreview";
import {
  HAIR_COLORS,
  HAIR_STYLES,
  PANTS_COLORS,
  SKIN_TONES,
  TOP_COLORS,
  type AvatarLook,
} from "@/components/coach/avatar";
import { addDemoHistory, removeDemoHistory, useDemoActive } from "@/lib/demoData";
import { useAllRecords } from "@/lib/progress";
import { useActivePlan } from "@/lib/usePlan";

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

function Swatches({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-xs font-bold text-ink/60">{label}</p>
      <div className="mt-1.5 flex gap-2">
        {options.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            aria-label={`${label} ${c}`}
            aria-pressed={value.toLowerCase() === c.toLowerCase()}
            style={{ backgroundColor: c }}
            className={`h-8 w-8 rounded-full ring-offset-2 ${value.toLowerCase() === c.toLowerCase() ? "ring-2 ring-ink" : "ring-1 ring-ink/15"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const prefs = usePrefs();
  const consent = useConsent();
  const demo = useDemoActive();
  const active = useActivePlan();
  const records = useAllRecords();

  const setLook = (patch: Partial<AvatarLook>) => setPrefs({ look: { ...prefs.look, ...patch } });

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
        <h2 className="font-display text-lg font-extrabold">Avatar view</h2>
        <p className="mt-2 text-sm text-ink/70">
          In the coach, see your avatar instead of yourself. Your camera still tracks your movement on your phone, but the
          picture isn&apos;t shown, recorded or uploaded.
        </p>
        <Toggle label="Use my avatar in the coach" on={prefs.avatar} onChange={(v) => setPrefs({ avatar: v })} />
        <div className="mt-2 flex items-start gap-4">
          <AvatarPreview look={prefs.look} className="h-44 w-28 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <Swatches label="Skin" options={SKIN_TONES} value={prefs.look.skin} onPick={(v) => setLook({ skin: v })} />
            <Swatches label="Hair" options={HAIR_COLORS} value={prefs.look.hair} onPick={(v) => setLook({ hair: v })} />
            <Swatches label="Top" options={TOP_COLORS} value={prefs.look.top} onPick={(v) => setLook({ top: v })} />
            <Swatches label="Trousers" options={PANTS_COLORS} value={prefs.look.pants} onPick={(v) => setLook({ pants: v })} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {HAIR_STYLES.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setLook({ hairStyle: h })}
              aria-pressed={prefs.look.hairStyle === h}
              className={`flex-1 rounded-full py-2 text-xs font-bold capitalize ${prefs.look.hairStyle === h ? "bg-mint-deep text-white" : "bg-chip text-ink/60"}`}
            >
              {h === "none" ? "No hair" : h}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="font-display text-lg font-extrabold">Presenting Reknit?</h2>
        <p className="mt-2 text-sm text-ink/70">
          Add five days of sample history so the streak, calendar and pain trend have something to show on a fresh phone.
          It is always labelled as sample data, never touches today, and can be removed in one tap.
        </p>
        {demo ? (
          <button type="button" className={`${btnSecondary} mt-3 w-full`} onClick={removeDemoHistory}>
            Remove sample history
          </button>
        ) : (
          <button
            type="button"
            disabled={!active}
            className={`${btnSecondary} mt-3 w-full disabled:opacity-50`}
            onClick={() => {
              if (!active) return;
              addDemoHistory(
                active.plan.conditionSlug,
                active.usable.map((e) => ({ slug: e.slug, name: e.name })),
                new Set(records.filter((r) => !r.demo).map((r) => r.date)),
              );
            }}
          >
            {active ? "Add sample history" : "Set up a plan first"}
          </button>
        )}
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
