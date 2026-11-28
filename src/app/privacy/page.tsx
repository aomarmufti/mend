export const metadata = { title: "Privacy — Reknit" };

const sections: { h: string; p: string[] }[] = [
  {
    h: "The short version",
    p: [
      "Reknit runs on your phone. Your camera video is analysed on the device and is never recorded, uploaded or stored.",
      "We do not run accounts or analytics, and we do not sell or share your data.",
    ],
  },
  {
    h: "What the camera does",
    p: [
      "The camera coach reads your body position frame by frame to check your form. Frames are processed in memory and discarded straight away. Nothing is saved and nothing leaves your device.",
    ],
  },
  {
    h: "What we keep",
    p: [
      "Your chosen area and condition, pain scores, completed sessions and exercise results are stored only in this app on your device. They are health information, so we treat them with care and give you full control.",
    ],
  },
  {
    h: "Crash reports",
    p: [
      "If the app hits an error, it can send the error message, the page address and your browser type to our server so we can fix it. It never includes your health information, your camera or your name.",
    ],
  },
  {
    h: "Delete your data",
    p: [
      "Settings > Delete all my data removes everything Reknit has stored. Deleting the app does the same.",
    ],
  },
  {
    h: "Not medical advice",
    p: [
      "Reknit supports general exercise and is not a medical device or a substitute for a clinician. If pain is severe, sudden or getting worse, stop and seek medical advice.",
    ],
  },
  {
    h: "Your rights",
    p: [
      "You can download a copy of your data (Settings > Download my data) and delete it (Settings > Delete all my data) at any time. You can withdraw consent in Settings.",
    ],
  },
  {
    h: "Contact",
    p: ["Questions about privacy: hello@reknit.co.uk"],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-12 font-sans text-ink">
      <h1 className="font-display text-3xl font-extrabold">Privacy</h1>
      <p className="mt-1 text-sm text-ink/60">Last updated 26 November 2026</p>
      {sections.map((s) => (
        <section key={s.h} className="mt-6">
          <h2 className="font-display text-lg font-extrabold">{s.h}</h2>
          {s.p.map((t) => (
            <p key={t} className="mt-2 text-[15px] leading-relaxed text-ink/80">
              {t}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
