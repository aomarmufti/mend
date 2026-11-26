import { notFound } from "next/navigation";
import { getCondition } from "@/data/conditions";
import { ScreenStep } from "@/components/start/ScreenStep";

export default async function ScreenPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; add?: string }>;
}) {
  const { c, add } = await searchParams;
  const condition = getCondition(c);
  if (!condition) notFound();
  return <ScreenStep conditionSlug={condition.slug} areaSlug={condition.areaSlug} adding={add === "1"} />;
}
