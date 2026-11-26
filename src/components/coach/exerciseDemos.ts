/**
 * Animated demonstrations for exercises that have no filmed footage.
 *
 * A demo is a handful of keyframes for a stick figure. Limbs are solved, not
 * tweened: planted feet stay planted because the knee is found as the
 * intersection of the thigh and shin circles (the same two-bone solve the heel
 * slide figure uses), and lying poses are built from joint angles so a bone is
 * always the same length. Only the numbers that describe the pose are
 * interpolated, so the figure cannot stretch or detach a foot between frames.
 *
 * These are schematic. They show the position and the direction of travel the
 * camera check looks for, not a clinician's technique, and they are no
 * substitute for the filmed reference clips in `public/reference` where those
 * exist. The catalog prefers a real clip whenever there is one.
 */

export type Vec = [number, number];

export const THIGH = 40;
export const SHIN = 40;
export const TORSO = 48;
export const UPPER_ARM = 26;
export const FOREARM = 26;
export const FOOT = 12;
export const HEAD_R = 9;

/** How a leg is described in a pose: planted ankle point, or joint angles. */
export type LegMode = "ik" | "fk";

export interface Pose {
  hip: Vec;
  /** Absolute angle of hip to shoulder, degrees. 0 is +x, 90 is down the screen. */
  torso: number;
  /** ik: ankle [x, y]. fk: [thigh angle, knee flexion], degrees. */
  near: Vec;
  far: Vec;
  /** Where the hand rests, relative to the shoulder. */
  arm: Vec;
  /** 0-1: how far the hands are drawn to the clasp point (hugging a knee). */
  clasp?: number;
}

export interface Keyframe {
  /** Milliseconds from the start of the loop. */
  at: number;
  pose: Pose;
  /** What the figure is doing from this keyframe until the next. */
  label: string;
  /** The position the check looks for: highlighted, and used for still frames. */
  target?: boolean;
}

export type Prop =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "dash"; x1: number; y1: number; x2: number; y2: number };

export interface Demo {
  slug: string;
  title: string;
  /** Standing demos are side-on. Hip abduction is shown as the camera sees it. */
  view: string;
  legs: { near: LegMode; far: LegMode };
  /** Draw feet. Off where the foot would point at or away from the camera. */
  foot: boolean;
  /** Where the clasped hands go. */
  clasp?: "knee" | "thigh";
  /** Draw this segment emphasised on target frames. */
  highlight?: "nearThigh";
  props: Prop[];
  keyframes: Keyframe[];
}

export interface Skeleton {
  hip: Vec;
  shoulder: Vec;
  head: Vec;
  nearKnee: Vec;
  nearAnkle: Vec;
  nearToe: Vec;
  farKnee: Vec;
  farAnkle: Vec;
  farToe: Vec;
  elbow: Vec;
  hand: Vec;
  label: string;
  target: boolean;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (from: Vec, length: number, deg: number): Vec => [
  from[0] + length * Math.cos(rad(deg)),
  from[1] + length * Math.sin(rad(deg)),
];

/**
 * Two-bone solve. `side` picks which way the joint bends: +1 puts it on the
 * forward (+x when the bone points down) side, as a knee does; -1 the other
 * way, as an elbow does. Returns the joint and the end point, which is pulled
 * back along the line if the target is further than the bones can reach.
 */
export function solveTwoBone(
  root: Vec,
  target: Vec,
  l1: number,
  l2: number,
  side: 1 | -1,
): { joint: Vec; end: Vec } {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const reach = l1 + l2 - 0.01;
  let d = Math.hypot(dx, dy);
  const ux = d === 0 ? 0 : dx / d;
  const uy = d === 0 ? 1 : dy / d;
  d = Math.min(Math.max(d, 1), reach);
  const a = (d * d + l1 * l1 - l2 * l2) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return {
    joint: [root[0] + ux * a + side * uy * h, root[1] + uy * a - side * ux * h],
    end: [root[0] + ux * d, root[1] + uy * d],
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpVec(a: Vec, b: Vec, t: number): Vec {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}
const smooth = (t: number) => t * t * (3 - 2 * t);

export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: lerpVec(a.hip, b.hip, t),
    torso: lerp(a.torso, b.torso, t),
    near: lerpVec(a.near, b.near, t),
    far: lerpVec(a.far, b.far, t),
    arm: lerpVec(a.arm, b.arm, t),
    clasp: lerp(a.clasp ?? 0, b.clasp ?? 0, t),
  };
}

export function loopLength(demo: Demo): number {
  return demo.keyframes[demo.keyframes.length - 1].at;
}

/** The pose, and the label that goes with it, `ms` into the loop. */
export function poseAt(demo: Demo, ms: number): { pose: Pose; label: string; target: boolean } {
  const kfs = demo.keyframes;
  const t = ((ms % loopLength(demo)) + loopLength(demo)) % loopLength(demo);
  let i = 0;
  while (i < kfs.length - 2 && t >= kfs[i + 1].at) i++;
  const a = kfs[i];
  const b = kfs[i + 1];
  const k = b.at === a.at ? 1 : smooth((t - a.at) / (b.at - a.at));
  return { pose: blend(a.pose, b.pose, k), label: a.label, target: !!a.target && !!b.target };
}

function leg(
  hip: Vec,
  mode: LegMode,
  v: Vec,
): { knee: Vec; ankle: Vec; footAngle: number } {
  if (mode === "ik") {
    const { joint, end } = solveTwoBone(hip, v, THIGH, SHIN, 1);
    // A planted foot lies flat on the floor whatever the shin is doing. A foot
    // whose ankle is raised (the back heel in a lunge) tips toe-down in
    // proportion, so the toes stay on the ground.
    const footAngle = Math.min(60, Math.max(0, ANKLE_Y - end[1]) * 12);
    return { knee: joint, ankle: end, footAngle };
  }
  const knee = polar(hip, THIGH, v[0]);
  const shinAngle = v[0] + v[1];
  return { knee, ankle: polar(knee, SHIN, shinAngle), footAngle: shinAngle - 90 };
}

export function skeleton(demo: Demo, ms: number): Skeleton {
  const { pose, label, target } = poseAt(demo, ms);
  const near = leg(pose.hip, demo.legs.near, pose.near);
  const far = leg(pose.hip, demo.legs.far, pose.far);
  const shoulder = polar(pose.hip, TORSO, pose.torso);
  const head = polar(shoulder, HEAD_R + 3, pose.torso);

  const rest: Vec = [shoulder[0] + pose.arm[0], shoulder[1] + pose.arm[1]];
  let handTarget = rest;
  const clasp = pose.clasp ?? 0;
  if (demo.clasp && clasp > 0) {
    const grip: Vec =
      demo.clasp === "thigh"
        ? [(pose.hip[0] + near.knee[0]) / 2, (pose.hip[1] + near.knee[1]) / 2]
        : near.knee;
    handTarget = lerpVec(rest, grip, clasp);
  }
  const arm = solveTwoBone(shoulder, handTarget, UPPER_ARM, FOREARM, -1);

  const toe = (ankle: Vec, footAngle: number): Vec =>
    demo.foot ? polar(ankle, FOOT, footAngle) : ankle;

  return {
    hip: pose.hip,
    shoulder,
    head,
    nearKnee: near.knee,
    nearAnkle: near.ankle,
    nearToe: toe(near.ankle, near.footAngle),
    farKnee: far.knee,
    farAnkle: far.ankle,
    farToe: toe(far.ankle, far.footAngle),
    elbow: arm.joint,
    hand: arm.end,
    label,
    target,
  };
}

// ---- demos -----------------------------------------------------------------

const GROUND = 164;
const ANKLE_Y = 160;
const MAT = 139;

const stand = (extra: Partial<Pose> = {}): Pose => ({
  hip: [110, 81],
  torso: -88,
  near: [112, ANKLE_Y],
  far: [102, ANKLE_Y],
  arm: [26, 30],
  ...extra,
});

const floorLine: Prop = { kind: "line", x1: 10, y1: GROUND, x2: 230, y2: GROUND };
const matLine: Prop = { kind: "line", x1: 14, y1: MAT, x2: 226, y2: MAT };
const chair: Prop[] = [
  { kind: "line", x1: 152, y1: 34, x2: 152, y2: GROUND },
  { kind: "line", x1: 152, y1: 34, x2: 184, y2: 34 },
];

/** Lying on the back: head left, legs running right, hip resting on the mat. */
const lying = (extra: Partial<Pose> = {}): Pose => ({
  hip: [104, 133],
  torso: 180,
  near: [-50, 95],
  far: [-50, 95],
  arm: [51.5, 0],
  ...extra,
});

const FOOT_FLAT: Vec = [-50, 95];

export const demos: Demo[] = [
  {
    slug: "mini-squat",
    title: "Mini squat",
    view: "Side-on",
    legs: { near: "ik", far: "ik" },
    foot: true,
    props: [floorLine],
    keyframes: [
      { at: 0, label: "Sink back and down, a quarter of the way", pose: stand({ arm: [30, 18] }) },
      {
        at: 1700,
        label: "Hold at the bottom, knees over your toes",
        target: true,
        pose: stand({ hip: [88, 93], torso: -68, arm: [38, 2] }),
      },
      {
        at: 2700,
        label: "Push back up through your heels",
        target: true,
        pose: stand({ hip: [88, 93], torso: -68, arm: [38, 2] }),
      },
      { at: 4300, label: "Stand tall", pose: stand({ arm: [30, 18] }) },
      { at: 5000, label: "Stand tall", pose: stand({ arm: [30, 18] }) },
    ],
  },
  {
    slug: "full-squat",
    title: "Full squat",
    view: "Side-on",
    legs: { near: "ik", far: "ik" },
    foot: true,
    props: [floorLine],
    keyframes: [
      { at: 0, label: "Hips back, then down", pose: stand({ arm: [30, 18] }) },
      {
        at: 2000,
        label: "Thighs level with the floor",
        target: true,
        pose: stand({ hip: [89, 124], torso: -53, arm: [40, 0] }),
      },
      {
        at: 3000,
        label: "Drive up through your heels",
        target: true,
        pose: stand({ hip: [89, 124], torso: -53, arm: [40, 0] }),
      },
      { at: 5000, label: "Stand tall", pose: stand({ arm: [30, 18] }) },
      { at: 5700, label: "Stand tall", pose: stand({ arm: [30, 18] }) },
    ],
  },
  {
    slug: "single-leg-stand",
    title: "Single leg stand",
    view: "Side-on",
    legs: { near: "ik", far: "fk" },
    foot: true,
    props: [floorLine, ...chair],
    keyframes: [
      {
        at: 0,
        label: "Hand on the chair, weight on one leg",
        pose: stand({ hip: [110, 81], near: [111, ANKLE_Y], far: [95, 0], arm: [36, 4] }),
      },
      {
        at: 1400,
        label: "Lift the other foot clear of the floor and hold",
        target: true,
        pose: stand({ hip: [110, 81], near: [111, ANKLE_Y], far: [24, 105], arm: [36, 4] }),
      },
      {
        at: 4400,
        label: "Hold steady, standing leg soft",
        target: true,
        pose: stand({ hip: [110, 81], near: [111, ANKLE_Y], far: [24, 105], arm: [36, 4] }),
      },
      {
        at: 5600,
        label: "Lower the foot with control",
        pose: stand({ hip: [110, 81], near: [111, ANKLE_Y], far: [95, 0], arm: [36, 4] }),
      },
      {
        at: 6400,
        label: "Hand on the chair, weight on one leg",
        pose: stand({ hip: [110, 81], near: [111, ANKLE_Y], far: [95, 0], arm: [36, 4] }),
      },
    ],
  },
  {
    slug: "single-leg-squat",
    title: "Single leg squat",
    view: "Side-on",
    legs: { near: "ik", far: "fk" },
    foot: true,
    props: [floorLine, ...chair],
    keyframes: [
      {
        at: 0,
        label: "Other leg lifted, hand on the chair",
        pose: stand({ near: [111, ANKLE_Y], far: [30, 110], arm: [36, 4] }),
      },
      {
        at: 2000,
        label: "Hips back, bend the standing knee only as far as you control",
        target: true,
        pose: stand({
          hip: [92, 98],
          torso: -70,
          near: [111, ANKLE_Y],
          far: [30, 110],
          arm: [36, 4],
        }),
      },
      {
        at: 2800,
        label: "Push back up, knee tracking over your foot",
        target: true,
        pose: stand({
          hip: [92, 98],
          torso: -70,
          near: [111, ANKLE_Y],
          far: [30, 110],
          arm: [36, 4],
        }),
      },
      {
        at: 4800,
        label: "Other leg lifted, hand on the chair",
        pose: stand({ near: [111, ANKLE_Y], far: [30, 110], arm: [36, 4] }),
      },
      {
        at: 5500,
        label: "Other leg lifted, hand on the chair",
        pose: stand({ near: [111, ANKLE_Y], far: [30, 110], arm: [36, 4] }),
      },
    ],
  },
  {
    slug: "forward-lunge",
    title: "Forward lunge",
    view: "Side-on",
    legs: { near: "ik", far: "ik" },
    foot: true,
    props: [floorLine],
    keyframes: [
      { at: 0, label: "Step forward with one leg", pose: stand({ arm: [28, 30] }) },
      {
        at: 1300,
        label: "Lower straight down, chest tall",
        pose: stand({
          hip: [122, 88],
          torso: -86,
          near: [150, ANKLE_Y],
          far: [90, 157],
          arm: [28, 30],
        }),
      },
      {
        at: 2600,
        label: "Front knee over the ankle, hold",
        target: true,
        pose: stand({
          hip: [120, 120],
          torso: -86,
          near: [150, ANKLE_Y],
          far: [90, 157],
          arm: [28, 30],
        }),
      },
      {
        at: 3500,
        label: "Push back up through the front heel",
        target: true,
        pose: stand({
          hip: [120, 120],
          torso: -86,
          near: [150, ANKLE_Y],
          far: [90, 157],
          arm: [28, 30],
        }),
      },
      {
        at: 4800,
        label: "Step back to standing",
        pose: stand({
          hip: [122, 88],
          torso: -86,
          near: [150, ANKLE_Y],
          far: [90, 157],
          arm: [28, 30],
        }),
      },
      { at: 6000, label: "Step back to standing", pose: stand({ arm: [28, 30] }) },
    ],
  },
  {
    slug: "isometric-knee-extension",
    title: "Isometric knee extension",
    view: "Side-on",
    legs: { near: "fk", far: "fk" },
    foot: true,
    highlight: "nearThigh",
    props: [matLine],
    keyframes: [
      { at: 0, label: "Lie on your back, leg straight", pose: lying({ near: [-1.5, 0], far: FOOT_FLAT }) },
      {
        at: 1300,
        label: "Push the back of the knee down and tighten the thigh. The leg barely moves.",
        target: true,
        pose: lying({ near: [0.8, 0], far: FOOT_FLAT }),
      },
      {
        at: 4300,
        label: "Hold, breathing normally",
        target: true,
        pose: lying({ near: [0.8, 0], far: FOOT_FLAT }),
      },
      { at: 5200, label: "Relax", pose: lying({ near: [-1.5, 0], far: FOOT_FLAT }) },
      { at: 6200, label: "Relax", pose: lying({ near: [-1.5, 0], far: FOOT_FLAT }) },
    ],
  },
  {
    slug: "hip-abduction",
    title: "Hip abduction",
    view: "Camera faces you",
    legs: { near: "fk", far: "fk" },
    foot: false,
    props: [matLine],
    keyframes: [
      {
        at: 0,
        label: "Lie on your side, legs together",
        pose: lying({ near: [-1, 0], far: [3, 0], arm: [51.5, 0] }),
      },
      {
        at: 1600,
        label: "Lift the top leg straight up, toes forward",
        target: true,
        pose: lying({ near: [-35, 0], far: [3, 0], arm: [51.5, 0] }),
      },
      {
        at: 3300,
        label: "Hold, hips stacked",
        target: true,
        pose: lying({ near: [-35, 0], far: [3, 0], arm: [51.5, 0] }),
      },
      {
        at: 5000,
        label: "Lower slowly",
        pose: lying({ near: [-1, 0], far: [3, 0], arm: [51.5, 0] }),
      },
      {
        at: 5800,
        label: "Lower slowly",
        pose: lying({ near: [-1, 0], far: [3, 0], arm: [51.5, 0] }),
      },
    ],
  },
  {
    slug: "active-knee-extension-stretch",
    title: "Hamstring stretch",
    view: "Side-on",
    legs: { near: "fk", far: "fk" },
    foot: true,
    clasp: "thigh",
    props: [matLine],
    keyframes: [
      {
        at: 0,
        label: "Hold the back of the thigh, hip bent to 90 degrees",
        pose: lying({ near: [-90, 90], far: FOOT_FLAT, clasp: 1 }),
      },
      {
        at: 2000,
        label: "Straighten the knee as far as is comfortable",
        target: true,
        pose: lying({ near: [-90, 12], far: FOOT_FLAT, clasp: 1 }),
      },
      {
        at: 4400,
        label: "Hold the stretch",
        target: true,
        pose: lying({ near: [-90, 12], far: FOOT_FLAT, clasp: 1 }),
      },
      {
        at: 6000,
        label: "Bend the knee and release",
        pose: lying({ near: [-90, 90], far: FOOT_FLAT, clasp: 1 }),
      },
      {
        at: 6800,
        label: "Bend the knee and release",
        pose: lying({ near: [-90, 90], far: FOOT_FLAT, clasp: 1 }),
      },
    ],
  },
  {
    slug: "prom-hip-flexion",
    title: "Hip flexion stretch",
    view: "Side-on",
    legs: { near: "fk", far: "fk" },
    foot: true,
    clasp: "knee",
    props: [matLine],
    keyframes: [
      {
        at: 0,
        label: "Lie on your back, knees bent",
        pose: lying({ near: FOOT_FLAT, far: FOOT_FLAT }),
      },
      {
        at: 2000,
        label: "Draw one knee toward your chest with both hands",
        target: true,
        pose: lying({ near: [-125, 135], far: FOOT_FLAT, clasp: 1 }),
      },
      {
        at: 4600,
        label: "Hold, lower back flat",
        target: true,
        pose: lying({ near: [-125, 135], far: FOOT_FLAT, clasp: 1 }),
      },
      {
        at: 6200,
        label: "Lower the foot back to the floor",
        pose: lying({ near: FOOT_FLAT, far: FOOT_FLAT }),
      },
      {
        at: 7000,
        label: "Lower the foot back to the floor",
        pose: lying({ near: FOOT_FLAT, far: FOOT_FLAT }),
      },
    ],
  },
  {
    slug: "supine-knee-hugs",
    title: "Knee hugs",
    view: "Side-on",
    legs: { near: "fk", far: "fk" },
    foot: true,
    clasp: "knee",
    props: [matLine],
    keyframes: [
      {
        at: 0,
        label: "Lie on your back, knees bent",
        pose: lying({ near: FOOT_FLAT, far: FOOT_FLAT }),
      },
      {
        at: 2000,
        label: "Bring both knees to your chest and hug them",
        target: true,
        pose: lying({ near: [-125, 135], far: [-118, 128], clasp: 1 }),
      },
      {
        at: 4600,
        label: "Hold, breathing slowly",
        target: true,
        pose: lying({ near: [-125, 135], far: [-118, 128], clasp: 1 }),
      },
      {
        at: 6200,
        label: "Lower the feet back to the floor",
        pose: lying({ near: FOOT_FLAT, far: FOOT_FLAT }),
      },
      {
        at: 7000,
        label: "Lower the feet back to the floor",
        pose: lying({ near: FOOT_FLAT, far: FOOT_FLAT }),
      },
    ],
  },
  {
    slug: "lumbar-rolling-stretch",
    title: "Lumbar rolling stretch",
    view: "Side-on",
    legs: { near: "fk", far: "fk" },
    foot: true,
    props: [matLine],
    keyframes: [
      {
        at: 0,
        label: "Knees bent, feet flat, shoulders down",
        pose: lying({ near: FOOT_FLAT, far: [-48, 93] }),
      },
      {
        at: 2200,
        label: "Let both knees drop slowly to one side",
        target: true,
        pose: lying({ near: [-22, 44], far: [-20, 42] }),
      },
      {
        at: 3600,
        label: "Hold, shoulders stay on the floor",
        target: true,
        pose: lying({ near: [-22, 44], far: [-20, 42] }),
      },
      {
        at: 5600,
        label: "Roll back to the middle, then the other side",
        pose: lying({ near: FOOT_FLAT, far: [-48, 93] }),
      },
      {
        at: 6400,
        label: "Roll back to the middle, then the other side",
        pose: lying({ near: FOOT_FLAT, far: [-48, 93] }),
      },
    ],
  },
];

export function getDemo(slug: string): Demo | undefined {
  return demos.find((d) => d.slug === slug);
}

/** A frame inside the first target hold, for still renders and reduced motion. */
export function stillTime(demo: Demo): number {
  const kf = demo.keyframes.find((k) => k.target);
  return kf ? kf.at + 1 : 0;
}
