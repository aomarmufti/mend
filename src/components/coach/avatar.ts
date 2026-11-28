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
export const PANTS_COLORS = ["#5B7186", "#7C8FA3", "#7E9460", "#B05F63", "#5568B5", "#3A3F47"];
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
  neck: 0.16,
  headRadius: 0.27,
  upperArm: 0.58,
  forearm: 0.5,
  thigh: 0.8,
  shin: 0.76,
  foot: 0.3,
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
export function retarget(lm: NormalizedLandmark[], w: number, h: number, prev: Rig | null, follow = FOLLOW): Rig | null {
  const P = (k: keyof typeof IDX) => seen(lm, IDX[k], w, h);
  const ls = P("ls"), rs = P("rs"), lh = P("lh"), rh = P("rh");
  const shoulderObs = ls && rs ? mid(ls, rs) : (ls ?? rs);
  const hipObs = lh && rh ? mid(lh, rh) : (lh ?? rh);
  if (!shoulderObs || !hipObs) return prev;

  const rawTorso = Math.max(8, len(sub(shoulderObs, hipObs)));
  const torso = prev ? prev.torso + (rawTorso - prev.torso) * 0.25 : rawTorso;
  const up = unit(sub(shoulderObs, hipObs));
  const hip = prev ? lerp(prev.hip, hipObs, follow) : hipObs;
  const shoulder = add(hip, mul(up, torso));

  const nose = P("nose");
  let headDir = nose ? unit(sub(nose, shoulderObs)) : up;
  if (headDir.x * up.x + headDir.y * up.y < 0.3) headDir = up;
  const headRadius = BODY.headRadius * torso;
  const headTarget = add(shoulder, mul(headDir, (BODY.neck + BODY.headRadius) * torso));
  const head = prev ? lerp(prev.head, headTarget, follow) : headTarget;
  // Which way they face only flips on a clear difference, so it never flickers when side-on.
  const noseOff = nose ? nose.x - shoulderObs.x : 0;
  const facing: 1 | -1 = nose && Math.abs(noseOff) > 0.12 * torso ? (noseOff >= 0 ? 1 : -1) : (prev?.facing ?? 1);

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
  const ease = (old: Pt | undefined, next: Pt) => (old ? lerp(old, next, follow) : next);

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
      // A foot sits roughly square to the shin, pointing the way they face. The tracked toe
      // is noisy, so it is only used when it agrees with that.
      const shinDir = unit(sub(out.ankle[i], out.knee[i]));
      const square = { x: shinDir.y, y: -shinDir.x };
      const forward = square.x * facing >= 0 ? square : mul(square, -1);
      let footDir = forward;
      if (sd.a && sd.f) {
        const seenDir = unit(sub(sd.f, sd.a));
        if (seenDir.x * forward.x + seenDir.y * forward.y > 0.7) footDir = seenDir;
      }
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

// ---------------------------------------------------------------------------
// Motion: filter the tracking, then glide the figure at the screen's own frame rate.
// ---------------------------------------------------------------------------

/**
 * One Euro filter: strong smoothing while a joint is steady, little while it is moving
 * fast, so a still body doesn't shimmer and a moving one doesn't lag.
 */
class OneEuro {
  private lastT: number | null = null;
  private prev = 0;
  private x = 0;
  private dx = 0;
  constructor(
    private minCutoff = 0.8,
    private beta = 12,
    private dCutoff = 1,
  ) {}
  reset() {
    this.lastT = null;
  }
  private static alpha(dt: number, cutoff: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(value: number, t: number): number {
    if (this.lastT === null) {
      this.lastT = t;
      this.prev = value;
      this.x = value;
      this.dx = 0;
      return value;
    }
    const dt = Math.max(1e-3, t - this.lastT);
    this.lastT = t;
    const raw = (value - this.prev) / dt;
    this.prev = value;
    this.dx += OneEuro.alpha(dt, this.dCutoff) * (raw - this.dx);
    this.x += OneEuro.alpha(dt, this.minCutoff + this.beta * Math.abs(this.dx)) * (value - this.x);
    return this.x;
  }
}

const POSE_POINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];

function cloneRig(r: Rig): Rig {
  const c = (a: [Pt, Pt]): [Pt, Pt] => [{ ...a[0] }, { ...a[1] }];
  return {
    torso: r.torso,
    hip: { ...r.hip },
    shoulder: { ...r.shoulder },
    head: { ...r.head },
    headRadius: r.headRadius,
    facing: r.facing,
    sh: c(r.sh),
    hp: c(r.hp),
    elbow: c(r.elbow),
    wrist: c(r.wrist),
    knee: c(r.knee),
    ankle: c(r.ankle),
    toe: c(r.toe),
  };
}

function approach(a: Rig, b: Rig, t: number): Rig {
  const p = (x: Pt, y: Pt) => lerp(x, y, t);
  const pair = (x: [Pt, Pt], y: [Pt, Pt]): [Pt, Pt] => [p(x[0], y[0]), p(x[1], y[1])];
  return {
    torso: a.torso + (b.torso - a.torso) * t,
    hip: p(a.hip, b.hip),
    shoulder: p(a.shoulder, b.shoulder),
    head: p(a.head, b.head),
    headRadius: a.headRadius + (b.headRadius - a.headRadius) * t,
    facing: b.facing,
    sh: pair(a.sh, b.sh),
    hp: pair(a.hp, b.hp),
    elbow: pair(a.elbow, b.elbow),
    wrist: pair(a.wrist, b.wrist),
    knee: pair(a.knee, b.knee),
    ankle: pair(a.ankle, b.ankle),
    toe: pair(a.toe, b.toe),
  };
}

/** How long the figure takes to catch up with a new reading. About two detection frames. */
const GLIDE_MS = 55;
/** After this long without a reading, the figure fades to a faint placeholder. */
const LOST_MS = 800;

/**
 * Keeps the avatar moving smoothly. Readings arrive at the camera's pace (often 15 to
 * 30 a second) and carry a little noise. Each one is filtered, becomes the figure's
 * target, and the figure on screen glides towards it every display frame, so the
 * motion stays smooth at the screen's full rate whatever the tracker is doing.
 */
export class AvatarAnimator {
  private filters = new Map<number, { x: OneEuro; y: OneEuro }>();
  private target: Rig | null = null;
  private shown: Rig | null = null;
  private lastReading: NormalizedLandmark[] | null = null;
  private lastSeenAt = 0;
  private lastNow = 0;
  private presence = 0;

  /** Call once per display frame with the newest reading (or null when nobody is tracked). */
  update(lm: NormalizedLandmark[] | null, w: number, h: number, now: number) {
    const dt = this.lastNow ? Math.min(120, Math.max(1, now - this.lastNow)) : 16;
    this.lastNow = now;

    if (lm && lm.length > 0 && lm !== this.lastReading) {
      this.lastReading = lm;
      this.lastSeenAt = now;
      const t = now / 1000;
      const filtered = lm.slice();
      for (const i of POSE_POINTS) {
        const p = lm[i];
        const f = this.filters.get(i) ?? { x: new OneEuro(), y: new OneEuro() };
        this.filters.set(i, f);
        if (!p || (typeof p.visibility === "number" ? p.visibility : 1) < VISIBLE) {
          f.x.reset();
          f.y.reset();
          continue;
        }
        filtered[i] = { ...p, x: f.x.filter(p.x, t), y: f.y.filter(p.y, t) };
      }
      // The filter has already smoothed the joints, so the figure takes them as they are.
      const rig = retarget(filtered, w, h, this.target, 1);
      if (rig) {
        this.target = rig;
        if (!this.shown) this.shown = cloneRig(rig);
      }
    }

    if (this.target && this.shown) this.shown = approach(this.shown, this.target, 1 - Math.exp(-dt / GLIDE_MS));
    const present = this.target !== null && now - this.lastSeenAt < LOST_MS ? 1 : 0;
    this.presence += (present - this.presence) * (1 - Math.exp(-dt / 220));
  }

  /** The figure as it is on screen right now, or null before anyone has been seen. */
  get current(): Rig | null {
    return this.shown;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, look: AvatarLook, good: boolean) {
    if (this.shown) drawAvatar(ctx, w, h, this.shown, look, { good, alpha: 0.22 + 0.78 * this.presence });
    else drawAvatar(ctx, w, h, neutralRig(w, h), look, { good: false, alpha: 0.18 });
  }
}

// ---------------------------------------------------------------------------
// Drawing.
// ---------------------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `a` blended towards `b` by `t` (0 to 1). */
export function mix(a: string, b: string, t: number): string {
  const x = a.startsWith("#") ? rgb(a) : (a.match(/\d+/g) ?? ["0", "0", "0"]).map(Number);
  const y = rgb(b);
  const c = (i: number) => Math.round(x[i] + (y[i] - x[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}
const darken = (c: string, t: number) => mix(c, "#000000", t);
const lighten = (c: string, t: number) => mix(c, "#FFFFFF", t);

/** A limb that tapers from radius `ra` at `a` to `rb` at `b`, with round ends. */
function limb(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, ra: number, rb: number, fill: string) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (d < 1e-3) {
    ctx.arc(a.x, a.y, Math.max(ra, rb), 0, Math.PI * 2);
  } else {
    const ang = Math.atan2(dy, dx);
    const phi = Math.acos(Math.max(-1, Math.min(1, (ra - rb) / d)));
    ctx.arc(a.x, a.y, ra, ang + phi, ang - phi + Math.PI * 2, false);
    ctx.arc(b.x, b.y, rb, ang - phi, ang + phi, false);
    ctx.closePath();
  }
  ctx.fill();
}

function disc(ctx: CanvasRenderingContext2D, c: Pt, r: number, fill: string | CanvasGradient) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
}

export interface DrawOptions {
  /** The exercise is going well: the ground glow turns mint. */
  good?: boolean;
  /** 0 to 1. The figure fades when nobody is being tracked. */
  alpha?: number;
}

function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, rig: Rig, good: boolean) {
  const T = rig.torso;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1D5349");
  g.addColorStop(1, "#0F302B");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // A soft light behind the figure lifts it off the background.
  const cx = (rig.hip.x + rig.shoulder.x) / 2;
  const cy = (rig.hip.y + rig.shoulder.y) / 2;
  const spot = ctx.createRadialGradient(cx, cy, 0, cx, cy, T * 3.4);
  spot.addColorStop(0, "rgba(255,255,255,0.11)");
  spot.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, w, h);

  const floorY = Math.max(rig.ankle[0].y, rig.ankle[1].y, rig.toe[0].y, rig.toe[1].y) + T * 0.07;
  const fx = (rig.hp[0].x + rig.hp[1].x) / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.stroke();
  const glow = ctx.createRadialGradient(fx, floorY, 0, fx, floorY, T * 1.7);
  glow.addColorStop(0, good ? "rgba(52,211,160,0.5)" : "rgba(255,255,255,0.14)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(fx, floorY, T * 1.7, T * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Paints the avatar scene: backdrop, a soft ground glow, and the figure. Everything is
 * drawn from the rig's joints with tapered, rounded shapes so it reads as a smooth,
 * friendly figure rather than a stick drawing.
 */
export function drawAvatar(ctx: CanvasRenderingContext2D, w: number, h: number, rig: Rig, look: AvatarLook, opts: DrawOptions = {}) {
  const { good = false, alpha = 1 } = opts;
  backdrop(ctx, w, h, rig, good);

  const T = rig.torso;
  const f = rig.facing;
  const skin = look.skin;
  const shoe = "#F4F6F7";

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const arm = (i: 0 | 1, far: boolean) => {
    const skinC = far ? darken(skin, 0.18) : skin;
    const topC = far ? darken(look.top, 0.26) : look.top;
    limb(ctx, rig.elbow[i], rig.wrist[i], T * 0.08, T * 0.064, skinC);
    disc(ctx, rig.wrist[i], T * 0.074, skinC);
    limb(ctx, rig.sh[i], rig.elbow[i], T * 0.108, T * 0.088, topC);
  };
  const leg = (i: 0 | 1, far: boolean) => {
    const pants = far ? darken(look.pants, 0.28) : look.pants;
    limb(ctx, rig.knee[i], rig.ankle[i], T * 0.118, T * 0.084, pants);
    limb(ctx, rig.hp[i], rig.knee[i], T * 0.152, T * 0.122, pants);
    limb(ctx, rig.ankle[i], rig.toe[i], T * 0.082, T * 0.07, far ? darken(shoe, 0.25) : shoe);
  };

  // Far side first.
  leg(1, true);
  arm(1, true);

  // Torso: a rounded trapezoid, a little wider when seen front-on.
  const axis = unit(sub(rig.shoulder, rig.hip));
  const n = { x: -axis.y, y: axis.x };
  const span = len(sub(rig.sh[0], rig.sh[1]));
  const front = Math.max(0, Math.min(1, span / (0.55 * T)));
  const ws = T * (0.2 + 0.14 * front);
  const wh = T * (0.185 + 0.12 * front);
  const grad = ctx.createLinearGradient(rig.shoulder.x, rig.shoulder.y, rig.hip.x, rig.hip.y);
  grad.addColorStop(0, lighten(look.top, 0.14));
  grad.addColorStop(1, darken(look.top, 0.1));
  ctx.fillStyle = grad;
  ctx.strokeStyle = grad;
  ctx.lineWidth = T * 0.1;
  ctx.beginPath();
  ctx.moveTo(rig.shoulder.x + n.x * ws, rig.shoulder.y + n.y * ws);
  ctx.lineTo(rig.shoulder.x - n.x * ws, rig.shoulder.y - n.y * ws);
  ctx.lineTo(rig.hip.x - n.x * wh, rig.hip.y - n.y * wh);
  ctx.lineTo(rig.hip.x + n.x * wh, rig.hip.y + n.y * wh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Neck and head.
  const r = rig.headRadius;
  const up = unit(sub(rig.head, rig.shoulder));
  limb(ctx, rig.shoulder, { x: rig.head.x - up.x * r * 0.7, y: rig.head.y - up.y * r * 0.7 }, T * 0.082, T * 0.07, darken(skin, 0.06));

  const hx = rig.head.x;
  const hy = rig.head.y;
  if (look.hairStyle === "long") {
    ctx.fillStyle = darken(look.hair, 0.05);
    ctx.beginPath();
    ctx.ellipse(hx - f * r * 0.5, hy + r * 0.95, r * 0.78, r * 1.75, f * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  if (look.hairStyle === "bun") {
    disc(ctx, { x: hx - f * r * 0.55, y: hy - r * 1.05 }, r * 0.46, look.hair);
  }
  // Ear, then the face.
  disc(ctx, { x: hx - f * r * 0.12, y: hy + r * 0.08 }, r * 0.17, darken(skin, 0.1));
  const face = ctx.createRadialGradient(hx - f * r * 0.2, hy - r * 0.3, r * 0.1, hx, hy, r * 1.05);
  face.addColorStop(0, lighten(skin, 0.1));
  face.addColorStop(1, skin);
  disc(ctx, rig.head, r, face);
  disc(ctx, { x: hx + f * r * 0.98, y: hy + r * 0.12 }, r * 0.11, skin); // nose, in profile
  if (look.hairStyle !== "none") {
    const a0 = Math.PI * 0.93;
    const a1 = Math.PI * 2.07;
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 1.06, a0, a1, false);
    ctx.quadraticCurveTo(hx + f * r * 0.1, hy - r * 0.38, hx + Math.cos(a0) * r * 1.06, hy + Math.sin(a0) * r * 1.06);
    ctx.closePath();
    ctx.fill();
  }
  // Eye, brow and a small smile.
  ctx.fillStyle = "#1B1B1F";
  ctx.beginPath();
  ctx.ellipse(hx + f * r * 0.46, hy + r * 0.02, r * 0.075, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(27,27,31,0.55)";
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(hx + f * r * 0.34, hy - r * 0.2);
  ctx.lineTo(hx + f * r * 0.6, hy - r * 0.23);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx + f * r * 0.5, hy + r * 0.3, r * 0.2, Math.PI * 0.15, Math.PI * 0.85, false);
  ctx.stroke();

  // Near side last, in front of the body.
  leg(0, false);
  arm(0, false);
  ctx.restore();
}
