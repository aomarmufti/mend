import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Reknit brand",
  robots: { index: false },
};

const options = [
  {
    key: "A",
    name: "Woven mark",
    file: "a-woven-mark-dark",
    note: "The in-app logo on the dark green. The amber thread passes over the bottom arm and under the top one. Matches the app.",
    pick: true,
  },
  {
    key: "B",
    name: "RK monogram",
    file: "b-rk-monogram",
    note: "RK with both diagonal legs in amber, like two stitches. The easiest to read at small sizes, but it drops the joint and goniometer idea.",
  },
  {
    key: "C",
    name: "Stitched r",
    file: "c-stitched-r",
    note: "A lowercase r whose shoulder is the thread, passing over the stem. The simplest shape, but the letter reads less clearly when small.",
  },
  {
    key: "D",
    name: "Woven mark, light",
    file: "d-woven-mark-light",
    note: "Option A on the light app background. Matches the app screens but stands out less on a light home screen.",
  },
];

const sizes = [60, 40, 29];

export default function BrandPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-12 pb-16">
      <p className="font-sans text-xs font-semibold tracking-wide text-moss uppercase">Brand</p>
      <h1 className="mt-1 font-display text-3xl">Reknit logo and App Store icon</h1>
      <p className="mt-2 max-w-xl font-sans text-sm text-ink/60">
        The in-app logo, then the four App Store icon options. Option A is chosen. Each 1024 px PNG is flat RGB with no
        transparency and square corners, which is what the App Store asks for. iOS rounds the
        corners itself.
      </p>

      <section className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl border border-mist bg-white/70 p-5">
        <Logo size={40} className="text-ink" />
        <div className="rounded-xl bg-night p-4 text-white">
          <Logo size={40} accent="#D98A3A" />
        </div>
        <Logo size={40} markOnly className="text-ink" />
      </section>

      <div className="mt-6 grid gap-4">
        {options.map((o) => (
          <article
            key={o.key}
            className={`grid gap-5 rounded-2xl border bg-white/70 p-5 sm:grid-cols-[200px_1fr] ${
              o.pick ? "border-amber" : "border-mist"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/brand/appstore/${o.file}-1024.png`}
              alt={`App Store icon option ${o.key}: ${o.name}`}
              width={200}
              height={200}
              className="h-[200px] w-[200px] rounded-[22.4%] shadow-lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-chip font-sans text-sm font-bold">
                  {o.key}
                </span>
                <h2 className="font-display text-xl">{o.name}</h2>
                {o.pick && (
                  <span className="rounded-full border border-amber px-2.5 py-0.5 font-sans text-xs font-bold text-amber">
                    Chosen
                  </span>
                )}
              </div>
              <p className="mt-2 font-sans text-sm text-ink/65">{o.note}</p>
              <div className="mt-4 flex items-end gap-5">
                {sizes.map((px) => (
                  <figure key={px} className="grid justify-items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/brand/appstore/${o.file}-1024.png`}
                      alt=""
                      width={px}
                      height={px}
                      style={{ width: px, height: px }}
                      className="rounded-[22.4%]"
                    />
                    <figcaption className="font-sans text-[11px] text-ink/50">{px} pt</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
