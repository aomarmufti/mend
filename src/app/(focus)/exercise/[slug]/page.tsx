import { notFound } from "next/navigation";
import { catalog, getCatalogExercise } from "@/data/catalog";
import { ExercisePage } from "@/components/exercise/ExercisePage";

export function generateStaticParams() {
  return catalog.map((e) => ({ slug: e.slug }));
}

export default async function ExerciseRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  if (!getCatalogExercise(slug)) notFound();
  return <ExercisePage slug={slug} from={from === "try" ? "try" : "plan"} />;
}
