import Link from "next/link";
import { ProgressBar, eyebrow } from "@/components/ui/kit";

export function SetupHeader({
  step,
  back,
  title,
  subtitle,
}: {
  step: 1 | 2 | 3 | 4;
  back?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        {back ? (
          <Link href={back} className="font-sans text-sm font-semibold text-ink/50">
            ← Back
          </Link>
        ) : (
          <span />
        )}
      </div>
      <ProgressBar pct={step * 25} className="mt-3 mb-4" />
      <p className={eyebrow}>Step {step} of 4</p>
      <h1 className="mt-1 font-display text-[28px] leading-tight font-extrabold">{title}</h1>
      {subtitle && <p className="mt-1.5 font-sans text-sm text-ink/60">{subtitle}</p>}
    </div>
  );
}
