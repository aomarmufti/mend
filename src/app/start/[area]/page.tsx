import { notFound } from "next/navigation";
import { bodyAreas, conditionsForArea, getArea } from "@/data/conditions";
import { ConditionPicker } from "@/components/start/ConditionPicker";
import { SetupHeader } from "@/components/flow/SetupHeader";

export function generateStaticParams() {
  return bodyAreas.map((area) => ({ area: area.slug }));
}

export default async function AreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ add?: string }>;
}) {
  const { area: areaSlug } = await params;
  const { add } = await searchParams;
  const area = getArea(areaSlug);
  if (!area) notFound();
  const q = add === "1" ? "?add=1" : "";

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-10">
      <SetupHeader
        step={2}
        back={`/start${q}`}
        title="What's the problem?"
        subtitle={`${area.label}. Pick the closest match. If a clinician has diagnosed you, use that.`}
      />
      <ConditionPicker conditions={conditionsForArea(areaSlug)} adding={add === "1"} />
    </div>
  );
}
