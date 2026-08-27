# Mend

A prototype rehab app for patellofemoral pain syndrome (PFPS), piloting the
NHS Lanarkshire 8-exercise programme. Next.js (App Router) + TypeScript +
Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000/today](http://localhost:3000/today).

## Structure

- **Today** — greeting, streak, today's session, pain check-in, weekly adherence.
- **Library** — all 8 exercises grouped by stage (Early/Middle/Late), with a
  placeholder video slot per exercise (`src/components/library/VideoEmbed.tsx`)
  ready to take real filmed footage.
- **Coach** *(Pro)* — real webcam pose tracking via
  [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision)
  (`PoseLandmarker`, GPU delegate, lite model), running entirely client-side.
  The heel-slides check computes the knee angle and ankle-to-hip horizontal
  distance to flag slide depth, plus a hip-rise check for lower-back
  compensation. Requires camera permission and a network path to Google's
  model/WASM CDN on first load.
- **Progress** — pain trend, adherence, AKPS function score, share-with-clinician UI.

`src/components/DeviceFrame.tsx` + `src/components/ShellChrome.tsx` are a
presentation-only iPhone frame for demos/screenshots — the app underneath is
a normal responsive page (toggle with the "Demo frame" button).

Exercise dosage/cues in `src/data/exercises.ts` are transcribed from NHS
Lanarkshire's PFPS guidance and should be confirmed against the source videos
before any clinical use.
