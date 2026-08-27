import Link from "next/link";
import { notFound } from "next/navigation";
import { bodyAreas, conditionsForArea, getArea } from "@/data/conditions";
import { ConditionPicker } from "@/components/start/ConditionPicker";

export function generateStaticParams() {
  return bodyAreas.map((area) => ({ area: area.slug }));
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area: areaSlug } = await params;
  const area = getArea(areaSlug);
  if (!area) notFound();

  const areaConditions = conditionsForArea(areaSlug);

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pt-12 pb-10">
      <Link href="/start" className="font-sans text-sm text-ink/50">
        ← All areas
      </Link>

      <p className="mt-6 font-sans text-xs font-semibold tracking-wide text-moss uppercase">
        {area.label}
      </p>
      <h1 className="mt-1 font-display text-3xl">What&apos;s the problem?</h1>
      <p className="mt-2 font-sans text-sm text-ink/60">
        Pick the closest match. If you have a diagnosis from a clinician, use
        that one.
      </p>

      <ConditionPicker conditions={areaConditions} />
    </div>
  );
}
