"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCatalogExercise } from "@/data/catalog";
import { ExerciseRunner } from "@/components/coach/ExerciseRunner";
import { canUse, useHydrated, useProfile } from "@/lib/profile";

export function CoachRoute({ slug, manual, from }: { slug: string; manual: boolean; from: "plan" | "try" }) {
  const router = useRouter();
  const exercise = getCatalogExercise(slug)!;
  const profile = useProfile();
  const hydrated = useHydrated();
  const allowed = canUse(profile, slug);
  const detail = `/exercise/${slug}?from=${from}`;

  useEffect(() => {
    if (hydrated && !allowed) router.replace(detail);
  }, [hydrated, allowed, router, detail]);

  if (!hydrated || !allowed) return <div className="fixed inset-0 bg-night" />;
  return (
    <ExerciseRunner
      exercise={exercise}
      camera={!manual}
      exitHref={from === "try" ? "/try" : "/plan"}
      onExit={() => router.push(detail)}
    />
  );
}
