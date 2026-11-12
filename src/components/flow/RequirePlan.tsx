"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeFor, useHydrated, useProfile } from "@/lib/profile";

/** The tabs need a plan. Anyone without one is sent to wherever they belong. */
export function RequirePlan({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const profile = useProfile();
  const hydrated = useHydrated();
  const missing = hydrated && profile.plans.length === 0;

  useEffect(() => {
    if (missing) router.replace(homeFor(profile));
  }, [missing, profile, router]);

  if (!hydrated || missing) return <div className="min-h-screen" />;
  return <>{children}</>;
}
