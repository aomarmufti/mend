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
  (`PoseLandmarker`, GPU delegate falling back to CPU, lite model), running
  entirely client-side. The heel-slides check computes the knee angle and
  ankle-to-hip horizontal distance to flag slide depth, plus a hip-rise check
  for lower-back compensation measured against a resting baseline calibrated
  over the first 30 tracked frames. Requires camera permission and a network
  path to Google's model/WASM CDN on first load.

  All scoring lives in `src/components/coach/poseMath.ts` as pure functions,
  separate from the camera loop, so a new exercise's checks can be written and
  tested without touching detection code. Three things in there are less
  obvious than they look:

  - **Landmarks are normalised 0–1 on *both* axes**, so on a 16:9 feed the x
    axis is compressed relative to y and angles measured directly off the raw
    values are wrong — by up to 16° at the extremes, and worst exactly where a
    heel slide lives (deep flexion and near-straight). Every angle and distance
    is taken in aspect-corrected space.
  - **Checks are graded 0–100, not pass/fail.** Two boolean checks can only
    ever produce four distinct totals, which reads on screen as a number stuck
    on one of a few values; a continuous score moves as the user corrects.
  - **Landmarks below 0.5 visibility are discarded**, and a frame that cannot
    be scored returns `null` so the UI holds the last smoothed reading instead
    of dropping to zero mid-rep.
- **Progress** — pain trend, adherence, AKPS function score, share-with-clinician UI.

`src/components/DeviceFrame.tsx` + `src/components/ShellChrome.tsx` are a
presentation-only iPhone frame for demos/screenshots — the app underneath is
a normal responsive page (toggle with the "Demo frame" button).

Exercise dosage/cues in `src/data/exercises.ts` are transcribed from NHS
Lanarkshire's PFPS guidance and should be confirmed against the source videos
before any clinical use.
