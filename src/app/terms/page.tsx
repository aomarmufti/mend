export const metadata = { title: "Terms of use — Reknit" };

const sections: { h: string; p: string }[] = [
  { h: "What Reknit is", p: "Reknit gives general exercise guidance, with a camera coach that gives feedback on your movement. It is not a medical device, it cannot diagnose a condition, and it does not replace advice from a doctor or physiotherapist." },
  { h: "Use it safely", p: "Check with a clinician before starting if you have a serious injury or health condition. Stop if you feel sharp, severe or worsening pain, dizziness or anything unusual. You use Reknit at your own risk and are responsible for exercising within your limits." },
  { h: "Camera feedback", p: "Form feedback is an estimate from your phone camera and can be wrong, for example in poor light or when you are partly out of frame. Don't rely on it to judge whether a movement is safe." },
  { h: "Your data", p: "How we handle your information is described in the privacy policy. You can delete everything stored by Reknit on your device at any time from Settings." },
  { h: "Changes and contact", p: "We may update these terms as Reknit changes, and will show the date below. Questions: reknit.support@gmail.com." },
];

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-12 font-sans text-ink">
      <h1 className="font-display text-3xl font-extrabold">Terms of use</h1>
      <p className="mt-1 text-sm text-ink/60">Last updated 26 November 2026. Draft pending legal review.</p>
      {sections.map((s) => (
        <section key={s.h} className="mt-6">
          <h2 className="font-display text-lg font-extrabold">{s.h}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{s.p}</p>
        </section>
      ))}
    </main>
  );
}
