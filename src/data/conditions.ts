/**
 * Body areas → named conditions → the exercise programme for each.
 *
 * A condition's `programme` is the id of a sourced exercise programme, or null
 * where no programme has been transcribed from a clinical source yet. Only the
 * PFPS programme (NHS Lanarkshire) is sourced today; the rest carry a real
 * condition name and description so the flow is complete, but deliberately
 * prescribe nothing. Inventing sets, reps and progressions for a rehab
 * protocol is not something to do from memory.
 */

export type ProgrammeId = "pfps";

export interface BodyArea {
  slug: string;
  label: string;
  icon: string;
  blurb: string;
}

export interface Condition {
  slug: string;
  areaSlug: string;
  name: string;
  alsoKnownAs?: string;
  summary: string;
  programme: ProgrammeId | null;
}

export const bodyAreas: BodyArea[] = [
  { slug: "knee", label: "Knee", icon: "🦵", blurb: "Kneecap pain, ligament and cartilage injury, wear." },
  { slug: "hip", label: "Hip", icon: "🕺", blurb: "Outer hip pain, joint stiffness, groin pain." },
  { slug: "foot", label: "Ankle & foot", icon: "🦶", blurb: "Heel pain, Achilles trouble, sprains." },
  { slug: "shoulder", label: "Shoulder", icon: "💪", blurb: "Overhead pain, stiffness, cuff injury." },
  { slug: "elbow", label: "Elbow & wrist", icon: "🤲", blurb: "Gripping pain, tendon overload, nerve symptoms." },
  { slug: "back", label: "Back", icon: "🧘", blurb: "Low back pain, disc-related pain, sciatica." },
];

export const conditions: Condition[] = [
  // Knee
  {
    slug: "patellofemoral-pain-syndrome",
    areaSlug: "knee",
    name: "Patellofemoral pain syndrome",
    alsoKnownAs: "PFPS, runner's knee, anterior knee pain",
    summary:
      "Pain around or behind the kneecap, typically worse on stairs, squatting, or after long periods sitting. The most common cause of knee pain in active adults.",
    programme: "pfps",
  },
  {
    slug: "patellar-tendinopathy",
    areaSlug: "knee",
    name: "Patellar tendinopathy",
    alsoKnownAs: "Jumper's knee",
    summary:
      "Pain at the tendon just below the kneecap, brought on by jumping and change-of-direction loading.",
    programme: null,
  },
  {
    slug: "knee-osteoarthritis",
    areaSlug: "knee",
    name: "Knee osteoarthritis",
    summary:
      "Joint pain and stiffness from cartilage wear, usually worse in the morning or after rest, easing with gentle movement.",
    programme: null,
  },
  {
    slug: "meniscal-injury",
    areaSlug: "knee",
    name: "Meniscal injury",
    alsoKnownAs: "Cartilage tear",
    summary:
      "Pain along the joint line after a twisting injury, sometimes with catching, locking or swelling.",
    programme: null,
  },
  {
    slug: "acl-reconstruction",
    areaSlug: "knee",
    name: "ACL reconstruction rehab",
    summary:
      "Staged rehabilitation after anterior cruciate ligament surgery, from early range of motion through to return to sport.",
    programme: null,
  },

  // Hip
  {
    slug: "gluteal-tendinopathy",
    areaSlug: "hip",
    name: "Gluteal tendinopathy",
    alsoKnownAs: "Greater trochanteric pain syndrome",
    summary:
      "Pain on the outside of the hip, often worse lying on that side at night or after walking.",
    programme: null,
  },
  {
    slug: "hip-osteoarthritis",
    areaSlug: "hip",
    name: "Hip osteoarthritis",
    summary:
      "Groin or buttock pain with stiffness and reduced rotation, typically worse after activity.",
    programme: null,
  },
  {
    slug: "femoroacetabular-impingement",
    areaSlug: "hip",
    name: "Femoroacetabular impingement",
    alsoKnownAs: "FAI, hip impingement",
    summary:
      "Groin pain on deep hip flexion or rotation, caused by extra bone at the hip joint restricting movement.",
    programme: null,
  },

  // Ankle & foot
  {
    slug: "plantar-fasciitis",
    areaSlug: "foot",
    name: "Plantar fasciitis",
    alsoKnownAs: "Plantar heel pain",
    summary:
      "Sharp pain under the heel, classically worst on the first steps in the morning and after sitting.",
    programme: null,
  },
  {
    slug: "achilles-tendinopathy",
    areaSlug: "foot",
    name: "Achilles tendinopathy",
    summary:
      "Pain and stiffness in the Achilles tendon, worse at the start of activity and after rest.",
    programme: null,
  },
  {
    slug: "ankle-sprain",
    areaSlug: "foot",
    name: "Lateral ankle sprain",
    summary:
      "Pain, swelling and instability on the outside of the ankle after rolling it inwards.",
    programme: null,
  },

  // Shoulder
  {
    slug: "rotator-cuff-tendinopathy",
    areaSlug: "shoulder",
    name: "Rotator cuff related shoulder pain",
    alsoKnownAs: "Subacromial pain, impingement",
    summary:
      "Pain on reaching overhead or out to the side, often with weakness and night pain on that shoulder.",
    programme: null,
  },
  {
    slug: "frozen-shoulder",
    areaSlug: "shoulder",
    name: "Frozen shoulder",
    alsoKnownAs: "Adhesive capsulitis",
    summary:
      "Progressive loss of shoulder movement in every direction, moving through painful, stiff and thawing phases.",
    programme: null,
  },

  // Elbow & wrist
  {
    slug: "lateral-epicondylalgia",
    areaSlug: "elbow",
    name: "Tennis elbow",
    alsoKnownAs: "Lateral epicondylalgia",
    summary:
      "Pain on the outside of the elbow when gripping, lifting or turning the wrist.",
    programme: null,
  },
  {
    slug: "medial-epicondylalgia",
    areaSlug: "elbow",
    name: "Golfer's elbow",
    alsoKnownAs: "Medial epicondylalgia",
    summary: "Pain on the inside of the elbow when gripping or flexing the wrist.",
    programme: null,
  },
  {
    slug: "carpal-tunnel-syndrome",
    areaSlug: "elbow",
    name: "Carpal tunnel syndrome",
    summary:
      "Numbness, tingling or weakness in the thumb side of the hand, often waking you at night.",
    programme: null,
  },

  // Back
  {
    slug: "non-specific-low-back-pain",
    areaSlug: "back",
    name: "Non-specific low back pain",
    summary:
      "Low back pain without a single identifiable structural cause — the most common presentation by a wide margin.",
    programme: null,
  },
  {
    slug: "lumbar-radiculopathy",
    areaSlug: "back",
    name: "Sciatica",
    alsoKnownAs: "Lumbar radiculopathy",
    summary:
      "Leg pain following a nerve path from the low back, sometimes with pins and needles or weakness.",
    programme: null,
  },
];

export function getArea(slug: string | undefined): BodyArea | undefined {
  return bodyAreas.find((a) => a.slug === slug);
}

export function conditionsForArea(areaSlug: string): Condition[] {
  return conditions.filter((c) => c.areaSlug === areaSlug);
}

export function getCondition(slug: string | undefined): Condition | undefined {
  return conditions.find((c) => c.slug === slug);
}

/** The condition the app defaults to — the one with a sourced programme. */
export const DEFAULT_CONDITION_SLUG = "patellofemoral-pain-syndrome";

export function areaHasProgramme(areaSlug: string): boolean {
  return conditionsForArea(areaSlug).some((c) => c.programme !== null);
}
