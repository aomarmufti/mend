import { notFound } from "next/navigation";
import { getCatalogExercise } from "@/data/catalog";
import { CoachRoute } from "@/components/coach/CoachRoute";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string; mode?: string; from?: string }>;
}) {
  const { exercise: slug, mode, from } = await searchParams;
  const exercise = getCatalogExercise(slug);
  if (!exercise) notFound();
  return <CoachRoute slug={exercise.slug} manual={mode === "manual"} from={from === "try" ? "try" : "plan"} />;
}
