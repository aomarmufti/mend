import { notFound } from "next/navigation";
import { getCondition } from "@/data/conditions";
import { PlanReady } from "@/components/start/PlanReady";

export default async function PlanStepPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; add?: string }>;
}) {
  const { c, add } = await searchParams;
  const condition = getCondition(c);
  if (!condition) notFound();
  return <PlanReady conditionSlug={condition.slug} adding={add === "1"} />;
}
