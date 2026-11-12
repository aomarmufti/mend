"use client";

import { useRouter } from "next/navigation";
import { ExerciseIntro } from "@/components/exercise/ExerciseIntro";
import { getCatalogExercise } from "@/data/catalog";
import { canUse, useHydrated, useProfile } from "@/lib/profile";
import { useActivePlan } from "@/lib/usePlan";

export function ExercisePage({ slug, from }: { slug: string; from: "plan" | "try" }) {
  const router = useRouter();
  const exercise = getCatalogExercise(slug)!;
  const profile = useProfile();
  const hydrated = useHydrated();
  const active = useActivePlan();
  const allowed = !hydrated || canUse(profile, slug);
  const back =
    from === "try"
      ? { href: "/try", label: "Free preview" }
      : { href: "/plan", label: active ? `${active.shape.areaLabel} plan` : "Plan" };
  const q = `exercise=${slug}&from=${from}`;

  return (
    <ExerciseIntro
      exercise={exercise}
      back={back}
      locked={!allowed}
      unlockHref={active ? `/start/plan?c=${active.plan.conditionSlug}` : "/welcome"}
      onCamera={() => router.push(`/coach?${q}`)}
      onManual={() => router.push(`/coach?${q}&mode=manual`)}
    />
  );
}
