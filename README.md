# Mend

A prototype rehab app for patellofemoral pain syndrome (PFPS), piloting the
NHS Lanarkshire 8-exercise programme. Next.js (App Router) + TypeScript +
Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). First-time visitors land
on the welcome screen.

## The flow

Built from the "Mend App Flow" design. Screens, in journey order:

1. **Welcome** (`/welcome`): the calf-stretch clip loops with the pose model's
   own landmarks drawn in sync (`public/reference/*.landmarks.json`, 15 fps).
   Continue with Apple / Google, or try two exercises free with no account.
2. **Free preview** (`/try`): quad and calf stretch with the camera; the rest
   is locked behind an account.
3. **Setup** (`/start` → `/start/[area]` → `/start/pain` → `/start/plan`):
   where does it hurt, which condition, pain today (the Progress baseline),
   then the plan with a reminder time and the 14-day trial. Areas and
   conditions say honestly whether a programme, stretches, or nothing is ready
   (tap "coming soon" to be told when it is). `/start?add=1` adds another plan.
4. **Today**: week strip, streak, today's session, pain check-in.
5. **Plan**: switch plans, current stage with today's progress, move to the
   next stage when it feels easy, mode per exercise (Camera coach / Hold timer
   / Cues only).
6. **Exercise** (`/exercise/[slug]`): what you do, what to watch for, camera
   setup and calibration provenance, then start with or without the camera.
7. **Coach: line up** (`/coach?exercise=…`): full-screen camera with framing
   checks (head and hips, feet, side-on / facing, lighting) from
   `src/components/coach/framing.ts`. Coaching starts by itself once lined up.
8. **Coach: live**: ring timer, set count, in-position pill, corrective hint
   from the signal, form scored per rep after each rep, and a set summary.
   Exercises without a camera check use a hold timer / rep counter instead.
9. **Progress**: week / month / all calendar with a dot per trained day, tap a
   day for its sets, pain change since the start, best hold, sessions, share
   with clinician.

`/session` runs today's exercises back to back and ends with a summary.

### Prototype limits

- **Sign-in is a stub.** Apple / Google record which button was pressed in
  `localStorage` (`src/lib/profile.ts`). No identity provider is wired up.
- **The trial is a start date, not a subscription.** No store billing; the
  price is a placeholder. "Restore purchase" finds nothing.
- **Reminders are stored, not delivered.** Delivering them needs push.
- All data lives on the device (`src/lib/store.ts` notifies every screen on
  write).

## Coach internals

- **Camera coach** — real webcam pose tracking via
  [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision)
  (`PoseLandmarker`, GPU delegate falling back to CPU, lite model, self-hosted
  under `public/mediapipe`), running entirely client-side. Every exercise runs
  on one engine (`HoldCoach` + `holdMath.ts`); the heel slide's depth and
  pelvis checks from `poseMath.ts` plug in as the `heelSlide` signal.

  Three things in `poseMath.ts` are less obvious than they look:

  - **Landmarks are normalised 0–1 on *both* axes**, so on a 16:9 feed the x
    axis is compressed relative to y and angles measured directly off the raw
    values are wrong — by up to 16° at the extremes. Every angle and distance
    is taken in aspect-corrected space.
  - **Checks are graded 0–100, not pass/fail**, so the score moves as the user
    corrects.
  - **Landmarks below 0.5 visibility are discarded**, and a frame that cannot
    be scored returns `null` so the coach holds the last state instead of
    resetting a hold mid-rep.

## Testing

```bash
npm test
```

Pure logic only (rep and hold counting, form quality, framing, heel slide,
calendar). The camera flow can be driven end to end in Chromium with a clip as
the webcam: convert it with `ffmpeg -i clip.mp4 -r 15 -pix_fmt yuv420p clip.y4m`
and launch with `--use-fake-device-for-media-stream
--use-fake-ui-for-media-stream --use-file-for-fake-video-capture=clip.y4m`.

`src/components/DeviceFrame.tsx` + `src/components/ShellChrome.tsx` are a
presentation-only iPhone frame for demos/screenshots — the app underneath is
a normal responsive page (append `?demo=1` to show the "Demo frame" toggle).

Exercise dosage/cues in `src/data/exercises.ts` are transcribed from NHS
Lanarkshire's PFPS guidance and should be confirmed against the source videos
before any clinical use.
