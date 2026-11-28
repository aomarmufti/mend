/**
 * What to do before each camera exercise starts: which leg, and exactly how to get into
 * position. {leg} is the leg being worked, {other} the other one. The coach starts by itself
 * once the person is in position and steady, so the last step says so.
 */
export interface GetReady {
  /** Worked one leg at a time: ask which leg first, and offer a switch afterwards. */
  sides: boolean;
  steps: string[];
}

const STEADY = "Once you're steady and in position, it starts by itself.";

const READY: Record<string, GetReady> = {
  "standing-quad-stretch": {
    sides: true,
    steps: [
      "Stand side-on to the camera so your whole body is in frame.",
      "Put one hand on a chair or the wall for balance.",
      "Stand tall on your {other} leg.",
      "Bend your {leg} knee and bring your heel up toward your bottom, holding your ankle.",
      "Keep your knee pointing at the floor. " + STEADY,
    ],
  },
  "standing-calf-stretch": {
    sides: true,
    steps: [
      "Stand side-on to the camera with your whole body and both feet in frame.",
      "Put both hands on a chair, table or wall in front of you.",
      "Step your {leg} foot back behind you, heel down, toes pointing forward.",
      "Bend your front knee and lean forward until you feel the stretch in your {leg} calf.",
      STEADY,
    ],
  },
  "active-knee-extension-stretch": {
    sides: true,
    steps: [
      "Lie on your back, side-on to the camera, whole body in frame.",
      "Bring your {leg} knee up toward your chest and clasp your hands behind that thigh, not over the knee.",
      "Keep the thigh still and slowly straighten your {leg} knee, reaching your foot to the ceiling.",
      STEADY,
    ],
  },
  "prom-hip-flexion": {
    sides: true,
    steps: [
      "Lie on your back, side-on to the camera, knees bent and feet flat, whole body in frame.",
      "Reach under your {leg} knee and pull it toward your chest, gripping behind the thigh.",
      "Keep your neck relaxed on the floor. " + STEADY,
    ],
  },
  "supine-knee-hugs": {
    sides: false,
    steps: [
      "Lie on your back, side-on to the camera, whole body in frame.",
      "Bring your knees up toward your chest and hug them in with your hands.",
      STEADY,
    ],
  },
  "lumbar-rolling-stretch": {
    sides: false,
    steps: [
      "Lie on your back, side-on to the camera, knees bent and feet flat.",
      "Keep your shoulders flat and let both knees roll over to one side.",
      STEADY,
    ],
  },
  "single-leg-stand": {
    sides: true,
    steps: [
      "Stand facing the camera with a chair or wall within reach.",
      "Put a hand on the support and stand on your {other} leg.",
      "Lift your {leg} foot off the floor, knee bent.",
      "Let go of the support when you feel stable. " + STEADY,
    ],
  },
  "single-leg-squat": {
    sides: true,
    steps: [
      "Stand side-on to the camera with a chair within reach.",
      "Stand on your {leg} leg, with your other foot just off the floor.",
      "Keep a hand near the chair, then bend your {leg} knee slowly once you're steady.",
      STEADY,
    ],
  },
  "forward-lunge": {
    sides: true,
    steps: [
      "Stand side-on to the camera with room to step forward.",
      "Step forward with your {leg} foot, then lower into the lunge once you're steady.",
      STEADY,
    ],
  },
  "mini-squat": {
    sides: false,
    steps: [
      "Stand side-on to the camera with a chair within reach.",
      "Feet shoulder-width apart, hands on the chair or out in front.",
      "Bend both knees a little, as if starting to sit. " + STEADY,
    ],
  },
  "full-squat": {
    sides: false,
    steps: [
      "Stand side-on to the camera, whole body and both feet in frame.",
      "Feet shoulder-width apart, arms out in front for balance.",
      "Lower until your thighs are level with the floor. " + STEADY,
    ],
  },
};

export function getReadyFor(slug: string, setupHint: string): GetReady {
  return READY[slug] ?? { sides: false, steps: [setupHint, "Get into position. " + STEADY] };
}

export function fill(text: string, leg: "left" | "right"): string {
  return text.replaceAll("{leg}", leg).replaceAll("{other}", leg === "left" ? "right" : "left");
}
