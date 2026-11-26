"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { btnPrimary, btnSecondary } from "@/components/ui/kit";
import { giveConsent, hasCurrentConsent, useConsent } from "@/lib/consent";
import { signOut, useHydrated, useProfile } from "@/lib/profile";

/** Pages that never touch health data, so they stay open without consent. */
const OPEN = ["/welcome", "/privacy", "/brand", "/camera-check", "/landing", "/settings"];

/**
 * Asks for explicit consent to process health data before anyone gets as far
 * as picking a condition or using the coach. It is its own screen, separate
 * from the privacy policy, and declining takes you back to the start.
 */
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useProfile();
  const consent = useConsent();

  const inApp = profile.account !== null || profile.preview || profile.plans.length > 0;
  const needed =
    hydrated && inApp && !hasCurrentConsent(consent) && !OPEN.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needed) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-night px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] font-sans text-white">
      <LogoMark className="h-8 w-8 text-white" accent="#34D3A0" />
      <h1 className="mt-5 font-display text-3xl leading-tight font-extrabold">Your health information</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-white/80">
        To build your plan, Reknit needs to record the condition you choose, your pain scores and the sessions you
        complete. This is health data, so we ask for your clear permission first.
      </p>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-white/75">
        <li>It stays on this device. We don&apos;t send it anywhere.</li>
        <li>Your camera is used live to check your form. It is never recorded or stored.</li>
        <li>You can withdraw consent or delete everything at any time in Settings.</li>
      </ul>
      <Link href="/privacy" className="mt-4 text-sm font-bold underline underline-offset-4">
        Read the privacy policy
      </Link>
      <div className="flex-1" />
      <button type="button" onClick={giveConsent} className={`${btnPrimary} w-full`}>
        I agree to Reknit using my health data
      </button>
      <button
        type="button"
        onClick={() => {
          signOut();
          router.replace("/welcome");
        }}
        className={`${btnSecondary} mt-2.5 w-full`}
      >
        No thanks
      </button>
    </main>
  );
}
