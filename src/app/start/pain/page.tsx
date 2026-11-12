import { notFound } from "next/navigation";
import { getCondition, getArea } from "@/data/conditions";
import { PainStep } from "@/components/start/PainStep";

export default async function PainStepPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; add?: string }>;
}) {
  const { c, add } = await searchParams;
  const condition = getCondition(c);
  if (!condition) notFound();
  const area = getArea(condition.areaSlug);
  return (
    <PainStep
      conditionSlug={condition.slug}
      areaSlug={condition.areaSlug}
      areaLabel={area?.label ?? condition.name}
      adding={add === "1"}
    />
  );
}
