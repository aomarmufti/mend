import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { Waitlist } from "@/components/landing/Waitlist";

export const metadata = {
  title: "Reknit — physio-led rehab with a camera coach",
  description: "Physio-led exercise plans with a camera coach that checks your form as you go. Your video never leaves your phone.",
};

const steps = [
  ["Pick what hurts", "Choose the area and condition. Reknit builds your plan from physio-set programmes."],
  ["Prop up your phone", "The camera coach finds you, counts your reps and times your holds."],
  ["Get told how you did", "Spoken cues and a live form score, so you correct as you go and not afterwards."],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-night font-sans text-white">
      <div className="mx-auto max-w-md px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-16">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold">
          <LogoMark className="h-6 w-6 text-white" accent="#34D3A0" />
          Reknit
        </span>

        <h1 className="mt-12 font-display text-5xl leading-[1.02] font-extrabold">
          Move better.
          <br />
          Hurt less.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/75">
          Physio-led exercise plans for knee, back and mobility problems, with a camera coach that checks your form
          while you do them.
        </p>
        <Link
          href="/welcome"
          className="mt-6 inline-block rounded-full bg-mint px-6 py-3.5 text-sm font-extrabold text-night"
        >
          Open the app
        </Link>

        <h2 className="mt-14 font-display text-2xl font-extrabold">How it works</h2>
        <ol className="mt-4 space-y-4">
          {steps.map(([h, p], i) => (
            <li key={h} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold">
                {i + 1}
              </span>
              <span>
                <span className="block font-bold">{h}</span>
                <span className="block text-sm leading-relaxed text-white/70">{p}</span>
              </span>
            </li>
          ))}
        </ol>

        <h2 className="mt-14 font-display text-2xl font-extrabold">Private by design</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          Your camera is read live on your phone and never recorded or uploaded. Your pain scores and sessions stay on
          your device. <Link href="/privacy" className="font-bold underline underline-offset-4">Read the privacy policy</Link>.
        </p>

        <h2 className="mt-14 font-display text-2xl font-extrabold">Get early access</h2>
        <p className="mt-2 mb-4 text-sm text-white/70">Leave your email and we&apos;ll tell you when the iPhone app is ready.</p>
        <Waitlist />

        <p className="mt-12 text-xs leading-relaxed text-white/50">
          Reknit supports general exercise and is not a medical device or a substitute for medical advice.
        </p>
      </div>
    </main>
  );
}
