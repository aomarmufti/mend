import type { HoldExerciseConfig } from "@/components/coach/HoldCoach";

/**
 * Camera-coached hold/stretch exercises, kept separate from `exercises.ts`.
 * That file is an exact transcription of the NHS Lanarkshire PFPS protocol —
 * every entry in it must trace back to that one source. These two do not:
 * they come from footage filmed directly by the person building this app,
 * not from NHS Lanarkshire, so folding them into that array would misrepresent
 * their provenance. Condition/programme assignment is still pending a decision
 * — see the note on each entry.
 */
export interface MobilityExercise {
  slug: string;
  name: string;
  position: string;
  dosage: string;
  cues: string[];
  hold: HoldExerciseConfig;
  /** Where the reference footage and cues came from, for the same traceability the sourced programme has. */
  provenance: string;
}

export const mobilityExercises: MobilityExercise[] = [
  {
    slug: "active-knee-extension-stretch",
    name: "Hamstring Stretch (Active Knee Extension)",
    position:
      "Lying on your back. Bend one knee and bring it toward your chest, then clasp your hands behind your thigh — not over the knee itself. Keeping the thigh still, slowly straighten the knee, reaching the foot up toward the ceiling.",
    dosage: "Hold 15–30s · repeat on one or both legs",
    cues: [
      "Keep the thigh where it is — the stretch comes from straightening the knee, not pulling the leg further back.",
      "Straighten only as far as feels like a stretch, not pain, at the back of the thigh.",
      "Breathe normally through the hold.",
    ],
    hold: {
      slug: "active-knee-extension-stretch",
      name: "Hamstring Stretch",
      // Derived from real reference footage: knee angle stayed 33-45° tucked,
      // reached 156-179° at full comfortable extension while the thigh was
      // held close to the chest (hip 75-95°). Angle tracking is reliable for
      // this exercise because the hands clasp behind the thigh, clear of the
      // hip and knee landmarks.
      signal: { kind: "legExtension", kneeMinDeg: 155, hipMinDeg: 70, hipMaxDeg: 100 },
      targetReps: 3,
      hold: { minHoldMs: 15_000 },
      setupHint: "Lie on your back, side-on to the camera, with your whole body in frame.",
    },
    provenance:
      "Filmed reference (single-leg technique), September 2026 — angle targets measured from that footage. Condition assignment not yet decided.",
  },
  {
    slug: "prom-hip-flexion",
    name: "Hip Flexion Stretch (Knee to Chest)",
    position:
      "Lying on your back with your neck relaxed on the floor, knees bent and feet flat. Reach underneath one knee and pull it toward your chest as far as feels comfortable, gripping behind the thigh rather than on top of the knee.",
    dosage: "Hold 15–30s · repeat on one or both legs",
    cues: [
      "Grip behind the thigh, not on the kneecap — that avoids compressing the knee joint.",
      "Only pull as far as is comfortable; this is a gentle stretch, not a strain.",
      "Keep your neck and shoulders relaxed against the floor throughout.",
    ],
    hold: {
      slug: "prom-hip-flexion",
      name: "Hip Flexion Stretch",
      // The hands clasp directly behind the thigh here, right where the hip
      // and knee landmarks sit — verified against real footage that this
      // makes angle tracking unreliable (hip/knee angle swinging by tens of
      // degrees between consecutive frames even at "confident" visibility).
      // The lifted foot is untouched by the hands and tracks far more
      // cleanly, so this exercise gates on foot lift rather than angle.
      signal: { kind: "footLift", minLift: 0.28 },
      targetReps: 3,
      hold: { minHoldMs: 15_000 },
      setupHint: "Lie on your back, side-on to the camera, with your whole body in frame.",
    },
    provenance:
      "Filmed reference, September 2026 — the lift threshold is calibrated from that footage, not yet clinically validated. Condition assignment not yet decided.",
  },
];

export function getMobilityExercise(slug: string): MobilityExercise | undefined {
  return mobilityExercises.find((e) => e.slug === slug);
}
