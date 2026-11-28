import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * The avatar: a stylised figure that moves the way the person moves, drawn instead of
 * the camera picture. Everyone gets the same body. Only the direction of each limb is
 * taken from the tracked pose; the lengths are fixed in proportion to the torso, so
 * the figure looks the same whatever someone's build, and a limb pointing at the
 * camera doesn't shrink to nothing.
 */

export type HairStyle = "short" | "long" | "bun" | "none";

export interface AvatarLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  pants: string;
}

export const SKIN_TONES = ["#F5D0B5", "#E8B48A", "#C98B5E", "#A8693F", "#7B4A2D", "#4E2E1D"];
export const HAIR_COLORS = ["#1B1B1F", "#4A2F1B", "#8A5A2B", "#C9A24B", "#B5472F", "#8E8E93"];
export const TOP_COLORS = ["#34D3A0", "#4A9FE0", "#F0A24A", "#E26D6D", "#A78BFA", "#F3F4F6"];
export const PANTS_COLORS = ["#26323F", "#3B4A5A", "#5B6B3A", "#7A3B3B", "#2F3E7A", "#1B1B1F"];
export const HAIR_STYLES: HairStyle[] = ["short", "long", "bun", "none"];

export const DEFAULT_LOOK: AvatarLook = {
  skin: SKIN_TONES[1],
  hair: HAIR_COLORS[1],
  hairStyle: "short",
  top: TOP_COLORS[0],
  pants: PANTS_COLORS[0],
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Reads a stored look, falling back to the default for anything that isn't valid. */
export function cleanLook(raw: unknown): AvatarLook {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof AvatarLook, unknown>>;
  const colour = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);
  return {
    skin: colour(r.skin, DEFAULT_LOOK.skin),
    hair: colour(r.hair, DEFAULT_LOOK.hair),
    hairStyle: HAIR_STYLES.includes(r.hairStyle as HairStyle) ? (r.hairStyle as HairStyle) : DEFAULT_LOOK.hairStyle,
    top: colour(r.top, DEFAULT_LOOK.top),
    pants: colour(r.pants, DEFAULT_LOOK.pants),
  };
}

export interface Pt {
  x: number;
  y: number;
}

/** Index 0 is the person's left, 1 the right, as the pose model labels them. */
export interface Rig {
  torso: number;
  hip: Pt;
  shoulder: Pt;
  head: Pt;
  headRadius: number;
  facing: 1 | -1;
  sh: [Pt, Pt];
  hp: [Pt, Pt];
  elbow: [Pt, Pt];
  wrist: [Pt, Pt];
  knee: [Pt, Pt];
  ankle: [Pt, Pt];
  toe: [Pt, Pt];
}

/** Body proportions in torso lengths (shoulder to hip). The same for everyone. */
export const BODY = {
  neck: 0.18,
  headRadius: 0.24,
  upperArm: 0.62,
  forearm: 0.54,
  thigh: 0.92,
  shin: 0.88,
  foot: 0.34,
  shoulderMax: 0.45,
  hipMax: 0.32,
} as const;

const VISIBLE = 0.35;
const IDX = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28, lf: 31, rf: 32 };

const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const unit = (a: Pt): Pt => {
  const l = len(a);
  return l < 1e-6 ? { x: 0, y: 1 } : { x: a.x / l, y: a.y / l };
};
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const clampLen = (v: Pt, max: number): Pt => (len(v) > max ? mul(unit(v), max) : v);

function seen(lm: NormalizedLandmark[], i: number, w: number, h: number): Pt | null {
  const p = lm[i];
  if (!p || (typeof p.visibility === "number" ? p.visibility : 1) < VISIBLE) return null;
  return { x: p.x * w, y: p.y * h };
}

/** How quickly the figure follows the person. 1 is instant, lower is smoother. */
const FOLLOW = 0.5;

/**
 * Builds this frame's figure from the tracked pose, in pixels of the `w` by `h` frame.
 * `prev` is the figure from the last frame: it smooths the movement and stands in for
 * any joint that isn't visible this frame. Returns null until a torso has been seen.
 */
export function retarget(lm: NormalizedLandmark[], w: number, h: number, prev: Rig | null): Rig | null {
  const P = (k: keyof typeof IDX) => seen(lm, IDX[k], w, h);
  const ls = P("ls"), rs = P("rs"), lh = P("lh"), rh = P("rh");
  const shoulderObs = ls && rs ? mid(ls, rs) : (ls ?? rs);
  const hipObs = lh && rh ? mid(lh, rh) : (lh ?? rh);
  if (!shoulderObs || !hipObs) return prev;

  const rawTorso = Math.max(8, len(sub(shoulderObs, hipObs)));
  const torso = prev ? prev.torso + (rawTorso - prev.torso) * 0.25 : rawTorso;
  const up = unit(sub(shoulderObs, hipObs));
  const hip = prev ? lerp(prev.hip, hipObs, FOLLOW) : hipObs;
  const shoulder = add(hip, mul(up, torso));

  const nose = P("nose");
  let headDir = nose ? unit(sub(nose, shoulderObs)) : up;
  if (headDir.x * up.x + headDir.y * up.y < 0.3) headDir = up;
  const headRadius = BODY.headRadius * torso;
  const headTarget = add(shoulder, mul(headDir, (BODY.neck + BODY.headRadius) * torso));
  const head = prev ? lerp(prev.head, headTarget, FOLLOW) : headTarget;
  const facing: 1 | -1 = nose ? (nose.x >= shoulderObs.x ? 1 : -1) : (prev?.facing ?? 1);

  const out: Rig = {
    torso,
    hip,
    shoulder,
    head,
    headRadius,
    facing,
    sh: [shoulder, shoulder],
    hp: [hip, hip],
    elbow: prev ? [...prev.elbow] : [shoulder, shoulder],
    wrist: prev ? [...prev.wrist] : [shoulder, shoulder],
    knee: prev ? [...prev.knee] : [hip, hip],
    ankle: prev ? [...prev.ankle] : [hip, hip],
    toe: prev ? [...prev.toe] : [hip, hip],
  };

  const sides = [
    { s: ls, e: P("le"), wr: P("lw"), hp: lh, k: P("lk"), a: P("la"), f: P("lf") },
    { s: rs, e: P("re"), wr: P("rw"), hp: rh, k: P("rk"), a: P("ra"), f: P("rf") },
  ];
  const ease = (old: Pt | undefined, next: Pt) => (old ? lerp(old, next, FOLLOW) : next);

  sides.forEach((sd, i) => {
    // The two shoulders and hips keep their observed spread, so front-on and side-on both read.
    const shOff = sd.s ? clampLen(sub(sd.s, shoulderObs), BODY.shoulderMax * torso) : { x: 0, y: 0 };
    const hpOff = sd.hp ? clampLen(sub(sd.hp, hipObs), BODY.hipMax * torso) : { x: 0, y: 0 };
    const sh = add(shoulder, shOff);
    const hp = add(hip, hpOff);
    out.sh[i] = sh;
    out.hp[i] = hp;

    // Arm: an unseen arm hangs down rather than freezing in the air.
    const elbowDir = sd.s && sd.e ? unit(sub(sd.e, sd.s)) : sd.e ? null : { x: 0, y: 1 };
    if (elbowDir) {
      const elbow = add(sh, mul(elbowDir, BODY.upperArm * torso));
      const wristDir = sd.e && sd.wr ? unit(sub(sd.wr, sd.e)) : elbowDir;
      out.elbow[i] = ease(prev?.elbow[i], elbow);
      out.wrist[i] = ease(prev?.wrist[i], add(out.elbow[i], mul(wristDir, BODY.forearm * torso)));
    }
    // Leg.
    const kneeDir = sd.hp && sd.k ? unit(sub(sd.k, sd.hp)) : sd.k ? null : { x: 0, y: 1 };
    if (kneeDir) {
      const knee = add(hp, mul(kneeDir, BODY.thigh * torso));
      const ankleDir = sd.k && sd.a ? unit(sub(sd.a, sd.k)) : kneeDir;
      out.knee[i] = ease(prev?.knee[i], knee);
      const ankle = add(out.knee[i], mul(ankleDir, BODY.shin * torso));
      out.ankle[i] = ease(prev?.ankle[i], ankle);
      const footDir = sd.a && sd.f ? unit(sub(sd.f, sd.a)) : { x: facing, y: 0 };
      out.toe[i] = ease(prev?.toe[i], add(out.ankle[i], mul(footDir, BODY.foot * torso)));
    }
  });
  return out;
}

/** A neutral standing figure, for previews and for before anyone is tracked. */
export function neutralRig(w: number, h: number): Rig {
  const torso = h * 0.24;
  const hip: Pt = { x: w / 2, y: h * 0.52 };
  const shoulder: Pt = { x: w / 2, y: hip.y - torso };
  const sp = torso * 0.34;
  const hs = torso * 0.2;
  const leg = (side: -1 | 1) => {
    const hp = { x: hip.x + side * hs, y: hip.y };
    const knee = { x: hp.x, y: hp.y + BODY.thigh * torso };
    const ankle = { x: knee.x, y: knee.y + BODY.shin * torso };
    return { hp, knee, ankle, toe: { x: ankle.x + 0.2 * torso * side, y: ankle.y + 0.04 * torso } };
  };
  const arm = (side: -1 | 1) => {
    const sh = { x: shoulder.x + side * sp, y: shoulder.y };
    const elbow = { x: sh.x + side * 0.1 * torso, y: sh.y + BODY.upperArm * torso };
    return { sh, elbow, wrist: { x: elbow.x + side * 0.06 * torso, y: elbow.y + BODY.forearm * torso } };
  };
  const [l, r] = [leg(-1), leg(1)];
  const [al, ar] = [arm(-1), arm(1)];
  return {
    torso,
    hip,
    shoulder,
    head: { x: shoulder.x, y: shoulder.y - (BODY.neck + BODY.headRadius) * torso },
    headRadius: BODY.headRadius * torso,
    facing: 1,
    sh: [al.sh, ar.sh],
    hp: [l.hp, r.hp],
    elbow: [al.elbow, ar.elbow],
    wrist: [al.wrist, ar.wrist],
    knee: [l.knee, r.knee],
    ankle: [l.ankle, r.ankle],
    toe: [l.toe, r.toe],
  };
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function seg(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, width: number, colour: string) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

/**
 * Paints the avatar scene: a dark backdrop, a soft ground shadow that glows mint while
 * the person is doing the exercise well, and the figure itself.
 */
export function drawAvatar(ctx: CanvasRenderingContext2D, w: number, h: number, rig: Rig, look: AvatarLook, good: boolean) {
  const T = rig.torso;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#14403A");
  g.addColorStop(1, "#0B2220");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const floorY = Math.max(rig.ankle[0].y, rig.ankle[1].y, rig.toe[0].y, rig.toe[1].y) + T * 0.08;
  const cx = (rig.hp[0].x + rig.hp[1].x) / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.stroke();
  const glow = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, T * 1.8);
  glow.addColorStop(0, good ? "rgba(52,211,160,0.45)" : "rgba(255,255,255,0.16)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, floorY, T * 1.8, T * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const skin = look.skin;
  const topFar = shade(look.top, 0.25);
  const pantsFar = shade(look.pants, 0.3);
  const skinFar = shade(skin, 0.2);
  const shoe = "#F3F4F6";

  // The right-hand limbs sit behind; the left-hand ones in front.
  for (const i of [1, 0] as const) {
    const far = i === 1;
    seg(ctx, rig.hp[i], rig.knee[i], T * 0.3, far ? pantsFar : look.pants);
    seg(ctx, rig.knee[i], rig.ankle[i], T * 0.24, far ? pantsFar : look.pants);
    seg(ctx, rig.ankle[i], rig.toe[i], T * 0.2, far ? shade(shoe, 0.25) : shoe);
    if (far) {
      seg(ctx, rig.sh[i], rig.elbow[i], T * 0.2, topFar);
      seg(ctx, rig.elbow[i], rig.wrist[i], T * 0.16, skinFar);
      ctx.fillStyle = skinFar;
      ctx.beginPath();
      ctx.arc(rig.wrist[i].x, rig.wrist[i].y, T * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Torso, as wide as the shoulders appear, never thinner than a body.
  const span = len(sub(rig.sh[0], rig.sh[1]));
  seg(ctx, rig.hip, rig.shoulder, Math.max(T * 0.5, span * 1.05), look.top);

  // Neck and head.
  seg(ctx, rig.shoulder, rig.head, T * 0.16, skin);
  const r = rig.headRadius;
  const f = rig.facing;
  const back = { x: rig.head.x - f * r * 0.1, y: rig.head.y };
  if (look.hairStyle === "long") {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.ellipse(back.x - f * r * 0.35, rig.head.y + r * 0.7, r * 0.75, r * 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (look.hairStyle === "bun") {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(back.x - f * r * 0.55, rig.head.y - r * 0.95, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(rig.head.x, rig.head.y, r, 0, Math.PI * 2);
  ctx.fill();
  if (look.hairStyle !== "none") {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(rig.head.x, rig.head.y, r * 1.04, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#1B1B1F";
  ctx.beginPath();
  ctx.arc(rig.head.x + f * r * 0.42, rig.head.y - r * 0.05, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Near limbs, drawn last so they overlap the body.
  const i = 0;
  seg(ctx, rig.sh[i], rig.elbow[i], T * 0.2, look.top);
  seg(ctx, rig.elbow[i], rig.wrist[i], T * 0.16, skin);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(rig.wrist[i].x, rig.wrist[i].y, T * 0.11, 0, Math.PI * 2);
  ctx.fill();
}
