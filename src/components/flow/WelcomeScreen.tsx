"use client";

import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { Pill } from "@/components/ui/kit";
import { LiveCoachPreview } from "@/components/welcome/LiveCoachPreview";
import { SignInButtons } from "@/components/flow/SignInButtons";
import { startPreview } from "@/lib/profile";

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col overflow-hidden bg-night text-white">
      <LiveCoachPreview className="absolute inset-x-0 top-0 h-[60%]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,rgba(14,42,38,.55) 0%,rgba(14,42,38,0) 22%,rgba(14,42,38,0) 44%,#0E2A26 60%)",
        }}
      />

      <div className="relative flex flex-1 flex-col px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-lg font-extrabold">
            <LogoMark className="h-6 w-6 text-white" accent="#34D3A0" />
            Mend
          </span>
          <Pill tone="glass">Live coach preview</Pill>
        </div>

        <div className="flex-1" />

        <h1 className="mb-5 font-display text-[34px] leading-[1.05] font-extrabold">
          Move better.
          <br />
          Hurt less.
        </h1>
        <p className="-mt-2 mb-5 max-w-xs font-sans text-sm text-white/70">
          Physio-led exercise plans, with a camera coach that checks your form as you go.
        </p>

        <SignInButtons />

        <button
          type="button"
          onClick={() => {
            startPreview();
            router.push("/try");
          }}
          className="mt-4 font-sans text-sm font-bold text-white underline underline-offset-4"
        >
          Try for free, no sign-up
        </button>
        <p className="mt-3 text-center font-sans text-[11px] text-white/60">
          Your video never leaves your phone.
        </p>
      </div>
    </div>
  );
}
