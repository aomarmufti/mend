import type { HoldExerciseConfig } from "@/components/coach/HoldCoach";

/**
 * Camera-coached hold/stretch exercises, kept separate from `exercises.ts`.
 * That file is an exact transcription of the NHS Lanarkshire PFPS protocol —
 * every entry in it must trace back to that one source. These do not: they
 * come from footage filmed directly by the person building this app, so
 * folding them into that array would misrepresent their provenance.
 *
 * `conditions` lists the conditions each stretch is offered under. This is NOT
 * a prescribed protocol: it is general mobility work relevant to the area,
 * surfaced for conditions that have no sourced programme so they are not a
 * dead end. The distinction matters and the UI states it — sets, reps and
 * progressions still only come from a clinical source.
 *
 * `hold` is null where the movement cannot be tracked from a phone camera —
 * see `cameraNote` for why. Those still show their cues and a plain timer
 * rather than pretending to check form.
 */
export interface MobilityExercise {
  slug: string;
  name: string;
  position: string;
  dosage: string;
  cues: string[];
  hold: HoldExerciseConfig | null;
  /** Condition slugs this stretch is offered under. See the note above. */
  conditions: string[];
  cameraNote?: string;
  /** Where the reference footage and cues came from, for the same traceability the sourced programme has. */
  provenance: string;
}

const FILMED = "Filmed reference, September 2026. Thresholds measured from that footage — one clip, one person, not clinically validated.";

/** One hold length across the set, so the coach behaves the same everywhere. */
const HOLD_MS = 15_000;

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
      // Measured: knee reached 156–179° at full comfortable extension with the
      // thigh held at hip 75–95°. Angles track cleanly here — the hands clasp
      // behind the thigh, clear of the hip and knee landmarks.
      signal: { kind: "jointBand", knee: { min: 155 }, hip: { min: 70, max: 100 } },
      targetReps: 3,
      hold: { minHoldMs: HOLD_MS },
      setupHint: "Lie on your back, side-on to the camera, with your whole body in frame.",
    },
    conditions: ["non-specific-low-back-pain", "lumbar-radiculopathy", "knee-osteoarthritis"],
    provenance: FILMED,
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
      // The hands clasp directly behind the thigh, right where the hip and knee
      // landmarks sit. Measured against real footage: angles there swing by tens
      // of degrees between consecutive frames even at "confident" visibility,
      // and smoothing barely helps. The lifted foot is untouched by the hands
      // and tracks far more cleanly, so this gates on foot lift instead.
      signal: { kind: "footLift", minLift: 0.28 },
      targetReps: 3,
      hold: { minHoldMs: HOLD_MS },
      setupHint: "Lie on your back, side-on to the camera, with your whole body in frame.",
    },
    conditions: ["non-specific-low-back-pain", "hip-osteoarthritis"],
    provenance: FILMED,
  },
  {
    slug: "supine-knee-hugs",
    name: "Supine Knee Hugs",
    position:
      "Lying on your back. Draw one foot up and then the other, then bring one knee toward your chest followed by the other, using your hands to help curl yourself into a ball.",
    dosage: "Hold 15–30s · repeat as comfortable",
    cues: [
      "Bring the knees up one at a time rather than lifting both together.",
      "Let your hands do the work — the legs should stay relaxed into the hug.",
      "Keep your head and shoulders resting on the floor.",
    ],
    hold: {
      slug: "supine-knee-hugs",
      name: "Supine Knee Hugs",
      // Cleanest signal of the set: hip angle goes 175° lying flat to 37–52°
      // fully tucked, and the two sides agreed within ~2° throughout a 4.8s
      // hold. No knee constraint — the knees fold naturally as the hips close,
      // and constraining both would reject valid variations in leg position.
      signal: { kind: "jointBand", hip: { max: 60 } },
      targetReps: 3,
      hold: { minHoldMs: HOLD_MS },
      setupHint: "Lie on your back, side-on to the camera, with your whole body in frame.",
    },
    conditions: ["non-specific-low-back-pain", "lumbar-radiculopathy"],
    provenance: FILMED,
  },
  {
    slug: "lumbar-rolling-stretch",
    name: "Lumbar Rolling Stretch",
    position:
      "Lying on your back with knees bent and feet flat on the floor. Keeping your shoulders flat, let both knees roll a little way over to one side and hold, then bring them back to the middle and roll to the other side.",
    dosage: "Hold 15s each side · alternate sides",
    cues: [
      "A small movement is the whole exercise — roll only as far as your lower back stays grounded.",
      "Shoulders stay flat throughout; the movement comes from the hips and lower back.",
      "Knees stay together, and come back through the middle before rolling the other way.",
    ],
    hold: {
      slug: "lumbar-rolling-stretch",
      name: "Lumbar Rolling Stretch",
      // Knee separation is the obvious measurement and the wrong one: the roll
      // runs along a side-on camera's depth axis, so both knees project onto
      // the same point (0.000–0.004 apart for a whole clip). What the camera
      // does see is the knees dropping as they roll. Measured across two rolls
      // in the reference clip: knees up and neutral sits at -0.60 torso
      // lengths, rolled reaches -0.48 to -0.39. -0.52 splits them with margin
      // on both sides, and it catches the roll about a third of a second after
      // the movement visibly starts.
      signal: { kind: "kneeRoll", maxKneeHeight: -0.52 },
      targetReps: 4,
      hold: { minHoldMs: HOLD_MS },
      setupHint: "Lie on your back, side-on to the camera, with your whole body in frame.",
    },
    conditions: ["non-specific-low-back-pain", "lumbar-radiculopathy"],
    provenance: FILMED,
  },
  {
    slug: "standing-calf-stretch",
    name: "Calf Stretch (Standing)",
    position:
      "Standing, holding a table or chair for support. Step the affected leg back behind you, heel down and toes pointing forwards. Bend the front knee and move your body forwards until you feel a stretch through the back of the calf.",
    dosage: "Hold 15–30s · repeat on the affected side",
    cues: [
      "Keep the back heel pressed down — letting it lift takes the stretch off the calf.",
      "The back knee stays straight; bend only the front knee.",
      "Use the chair for balance, not to take your weight.",
    ],
    hold: {
      slug: "standing-calf-stretch",
      name: "Calf Stretch",
      // Measured: back knee held 170–174° while the front knee sat at 124–143°
      // and stance separation stayed at 0.147–0.162 for 6.5s, against 0.001
      // standing normally. Both thresholds sit clear of the setup phase, so
      // stepping into the stance is what starts the timer.
      signal: { kind: "splitStance", backKneeMin: 165, minSeparation: 0.13 },
      targetReps: 3,
      hold: { minHoldMs: HOLD_MS },
      setupHint: "Stand side-on to the camera with your whole body and both feet in frame.",
    },
    conditions: ["achilles-tendinopathy", "plantar-fasciitis"],
    provenance: FILMED,
  },
  {
    slug: "standing-quad-stretch",
    name: "Quadriceps Stretch (Standing)",
    position:
      "Standing, using a desk or chair for support. Raise one leg behind you and take hold of the ankle or lower leg, drawing the heel up toward your buttocks while keeping the knee pointing down at the floor.",
    dosage: "Hold · then repeat on the other leg",
    cues: [
      "Keep the knee pointing at the floor — letting it drift forwards loses the stretch.",
      "Draw the heel up only as far as is comfortable.",
      "Stand tall; don't lean forward over the support.",
    ],
    hold: {
      slug: "standing-quad-stretch",
      name: "Quadriceps Stretch",
      // Measured: knee folded to 42–65° with the hip held at 176–179°, which is
      // exactly the "knee pointing at the floor" cue expressed as a number —
      // an early attempt in the same clip that let the thigh swing forward
      // read hip 89° and is correctly rejected by the hip floor.
      // Ankle visibility runs 0.62–0.67 (a hand is gripping it), so this is
      // the noisiest of the tracked set.
      signal: { kind: "jointBand", knee: { max: 80 }, hip: { min: 155 } },
      targetReps: 3,
      hold: { minHoldMs: HOLD_MS },
      setupHint: "Stand side-on to the camera with your whole body in frame.",
    },
    conditions: ["patellofemoral-pain-syndrome", "knee-osteoarthritis"],
    provenance: FILMED,
  },
];

export function getMobilityExercise(slug: string): MobilityExercise | undefined {
  return mobilityExercises.find((e) => e.slug === slug);
}

/** Stretches offered under a condition. Not a prescribed protocol — see the note above. */
export function getMobilityForCondition(conditionSlug: string): MobilityExercise[] {
  return mobilityExercises.filter((e) => e.conditions.includes(conditionSlug));
}
