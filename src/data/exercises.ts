export type Stage = "Early" | "Middle" | "Late";

export interface Exercise {
  id: number;
  slug: string;
  name: string;
  stage: Stage;
  position: string;
  dosage: string;
  cues: string[];
  cameraCoach: boolean;
  cameraNote?: string;
}

export const exercises: Exercise[] = [
  {
    id: 1,
    slug: "isometric-knee-extension",
    name: "Isometric Knee Extension",
    stage: "Early",
    position:
      "Lying on your back, leg straight. Push the back of your knee down into the bed and tighten your thigh.",
    dosage: "5–10 reps · hold 5–45s · 1–3×/day",
    cues: [
      "Push the knee down, don't just tense the whole leg.",
      "Breathe normally through the hold — don't brace.",
      "Kneecap should feel like it's being pulled up your thigh.",
    ],
    cameraCoach: false,
    cameraNote: "Isometric — no visible movement. Hold-timer only, no angle tracking.",
  },
  {
    id: 2,
    slug: "hip-abduction",
    name: "Hip Abduction",
    stage: "Early",
    position:
      "Side-lying, cushion between thighs. Top leg lifts straight up like a scissor, then lowers with control.",
    dosage: "5–15 reps · hold 5s · 1–3× every 2nd day",
    cues: [
      "Keep the lifted leg straight, hip stacked over hip.",
      "Lift from the side of the hip, not by rocking backward.",
      "Lower slowly — don't let it drop.",
    ],
    cameraCoach: true,
    cameraNote: "Needs a front-on camera framing, not side-on.",
  },
  {
    id: 3,
    slug: "heel-slides",
    name: "Hip Flexion (Heel Slides)",
    stage: "Early",
    position:
      "Lying on your back. Heel slides toward your bottom, bending the knee and hip, then slides back out straight.",
    dosage: "5–10 reps · 1–3×/day",
    cues: [
      "Slide the heel further toward you for full depth.",
      "Keep your lower back flat on the mat — don't arch to help the slide.",
      "Slide back out with control, don't let the leg drop straight.",
    ],
    cameraCoach: true,
    cameraNote: "Side-view, lying position — the reference implementation for the Coach tab.",
  },
  {
    id: 4,
    slug: "mini-squat",
    name: "Mini Squat",
    stage: "Middle",
    position:
      "Standing, holding a chair for balance. Squat down to roughly 45–60° — not as deep as parallel.",
    dosage: "5–15/day · 2–3× every 2nd day",
    cues: [
      "Knees track over your toes, not past them.",
      "Keep weight through your heels.",
      "Chair is for balance, not to take your weight.",
    ],
    cameraCoach: true,
    cameraNote: "Standing, side-view framing.",
  },
  {
    id: 5,
    slug: "full-squat",
    name: "Full Squat",
    stage: "Middle",
    position:
      "Standing, arms forward for balance. Squat until thighs are parallel to the floor, heels stay down, knees over — not past — toes.",
    dosage: "5–15/day · 2–3× every 2nd day",
    cues: [
      "Heels flat throughout — don't rise onto your toes.",
      "Sit back like reaching for a low chair.",
      "Knees track in line with your second toe.",
    ],
    cameraCoach: true,
    cameraNote: "Standing, side-view framing.",
  },
  {
    id: 6,
    slug: "single-leg-stand",
    name: "Single Leg Stand",
    stage: "Middle",
    position:
      "Balance on the affected leg, with or without a chair for support. Hold, then build up the time.",
    dosage: "Aim for 10s, build up · up to 3×/day",
    cues: [
      "Stand tall, hips level.",
      "Soft knee, not locked out.",
      "Fix your eyes on a point ahead to steady balance.",
    ],
    cameraCoach: true,
    cameraNote: "Balance / hold-time metric, not an angle check.",
  },
  {
    id: 7,
    slug: "single-leg-squat",
    name: "Single Leg Squat",
    stage: "Late",
    position:
      "One hand on a chair for balance, other leg bent in the air. Push your hips back and bend the standing knee.",
    dosage: "5–15/day · 1–3× every 2nd day",
    cues: [
      "Hips back first, then let the knee bend.",
      "Keep the standing knee tracking over the foot, not caving in.",
      "Only go as deep as you can control.",
    ],
    cameraCoach: true,
    cameraNote: "Standing, side-view framing.",
  },
  {
    id: 8,
    slug: "forward-lunge",
    name: "Forward Lunge",
    stage: "Late",
    position:
      "Step forward, front knee bends, back knee drops toward the floor, then push back to standing with control.",
    dosage: "5–15/day · 1–3× every 2nd day",
    cues: [
      "Front knee stays over the front foot.",
      "Keep your torso upright through the movement.",
      "Push through the front heel to return.",
    ],
    cameraCoach: true,
    cameraNote: "Standing, split-stance framing.",
  },
];

/** The only exercise with real Camera Coach tracking logic built so far. */
export const SUPPORTED_COACH_SLUG = "heel-slides";

export const stageOrder: Stage[] = ["Early", "Middle", "Late"];

export const stageDescription: Record<Stage, string> = {
  Early: "Start here. Progress once these feel easy.",
  Middle: "Move on once Early exercises feel comfortable and pain-free.",
  Late: "The final stage before returning to full activity.",
};

export function exercisesByStage(stage: Stage): Exercise[] {
  return exercises.filter((e) => e.stage === stage);
}

export function getExerciseBySlug(slug: string): Exercise | undefined {
  return exercises.find((e) => e.slug === slug);
}
