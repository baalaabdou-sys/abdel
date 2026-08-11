import { BEAT, type Hit } from "@/components/portfolio/ad/score";

/**
 * ACT 2 — one continuous take.
 *
 * The rule this file exists to enforce: no shot is designed on its own. Every
 * entry declares the object that is filling the frame when it ends, and the
 * next entry must open on that same object filling the frame. The cut is then
 * performed *through* that object rather than across a fade, so there is no
 * frame in the film where nothing is happening.
 *
 * Two kinds of segment sit on the same timeline and are deliberately
 * indistinguishable to the viewer:
 *
 *   "clip"  — generated footage of the character physically moving through a
 *             world (city, code, the fall, the chase).
 *   "live"  — the scene is built from the real interface at runtime. Reality
 *             bending has to be live: the crack has to split *this* viewport,
 *             the glass he knocks on has to be the visitor's actual screen,
 *             and the final pull-back has to land on the real portfolio. A
 *             pre-rendered video cannot do any of those.
 *
 * Because a live segment is drawn rather than played, it has no seam at all —
 * which is exactly why the second half of the act is built this way.
 */

export type Act2ClipKey =
  | "a2_cursor_pull"
  | "a2_city_surf"
  | "a2_code_run"
  | "a2_error_fall"
  | "a2_chase";

/** The live set pieces, in the order they appear. */
export type LiveScene =
  | "bridge_tear"
  | "bridge_fall"
  | "crack"
  | "realities"
  | "zerog"
  | "glass"
  | "clones"
  | "freeze"
  | "lens"
  | "fold"
  | "cube"
  | "pixel"
  | "signoff";

/**
 * How one shot becomes the next. Every one of these travels *through*
 * something already in frame — none of them is a dissolve, and none of them
 * passes through black.
 */
export type Cut =
  /** Camera keeps its velocity; the incoming shot is already moving. Invisible. */
  | "continue"
  /** The object filling frame is punched through: outgoing pushes past the
      lens while the incoming arrives already large and settles. */
  | "through"
  /** Something sweeps the lens (a hand, a card, a browser edge) and the world
      behind it has changed. */
  | "wipe"
  /** The frame splits down the middle and is pulled apart. */
  | "tear"
  /** Glass fractures outward and the shards are the next scene. */
  | "shatter"
  /** Everything stops dead. Used once. */
  | "freeze"
  /** Into the lens: a circle closes on his glasses and opens on the far side. */
  | "iris"
  /** The camera keeps pulling back and the previous frame becomes an object
      inside the new one. */
  | "pullback"
  /** The floor goes. The world rushes up past the lens as the camera drops,
      so a fall reads as a fall instead of an unexplained new shot. */
  | "drop";

export type Shot = {
  beat: number;
  cut: Cut;
  /** Direction for wipes and continues. */
  dir?: 1 | -1;
  /** What is filling the frame as this shot ends — the next shot opens on it. */
  handoff: string;
  /**
   * How far ahead of the picture this shot's sound starts, in beats. This is
   * the J-cut: you hear the next world before you are in it.
   */
  lead: number;
} & ({ kind: "clip"; clip: Act2ClipKey } | { kind: "live"; scene: LiveScene });

export const ACT2: Shot[] = [
  // ── he takes hold of the interface itself ──────────────
  {
    kind: "clip",
    clip: "a2_cursor_pull",
    beat: 0,
    cut: "continue",
    handoff: "the torn opening in the stretched page, filling frame",
    lead: 0,
  },
  // ── through the tear: the light opens out and a city rises into it.
  //    Drawn, not filmed — it is a pure camera move with no character in it,
  //    which makes it cheaper to draw than to generate and seamless either way.
  {
    kind: "live",
    scene: "bridge_tear",
    beat: 10,
    cut: "through",
    handoff: "the city below, camera falling toward the streets",
    lead: 1.5,
  },
  // ── through the tear, into the city, surfing ───────────
  {
    kind: "clip",
    clip: "a2_city_surf",
    beat: 14,
    cut: "through",
    handoff: "him falling away between two towers, camera diving after him",
    lead: 1.5,
  },
  // ── the fall turns the city into code. Also drawn: the towers resolving
  //    into syntax is a dissolve of geometry, which DOM does cleanly.
  {
    kind: "live",
    scene: "bridge_fall",
    beat: 24,
    cut: "continue",
    handoff: "code platforms resolving under him as he lands",
    lead: 1,
  },
  {
    kind: "clip",
    clip: "a2_code_run",
    beat: 28,
    cut: "continue",
    handoff: "him dropping out of frame, camera pitching down into darkness",
    lead: 1,
  },
  // ── the fall, the errors, the one with a face ──────────
  {
    kind: "clip",
    clip: "a2_error_fall",
    beat: 38,
    cut: "drop",
    handoff: "a browser window filling frame, fracturing toward the lens",
    lead: 1,
  },
  // ── the chase, through one interface into the next ─────
  {
    kind: "clip",
    clip: "a2_chase",
    beat: 48,
    cut: "shatter",
    handoff: "the shockwave from the command palette, hitting the lens",
    lead: 1.5,
  },

  // ── from here the film is drawn, not played ────────────
  {
    kind: "live",
    scene: "crack",
    beat: 58,
    cut: "through",
    handoff: "the crack he has pulled open, edges filling frame",
    lead: 1.5,
  },
  {
    kind: "live",
    scene: "realities",
    beat: 66,
    cut: "tear",
    handoff: "both halves crushed together at the centre",
    lead: 1,
  },
  {
    kind: "live",
    scene: "zerog",
    beat: 78,
    cut: "continue",
    handoff: "a thrown phone spinning toward the lens, screen growing",
    lead: 1,
  },
  {
    kind: "live",
    scene: "glass",
    beat: 88,
    cut: "through",
    handoff: "the layer he has torn open behind the glass",
    lead: 1.5,
  },
  {
    kind: "live",
    scene: "clones",
    beat: 100,
    cut: "wipe",
    dir: -1,
    handoff: "the last clone pulled back into him, chaos at its peak",
    lead: 1,
  },
  {
    kind: "live",
    scene: "freeze",
    beat: 112,
    cut: "freeze",
    handoff: "his glasses, held up, the whole universe reflected in them",
    lead: 0,
  },
  {
    kind: "live",
    scene: "lens",
    beat: 122,
    cut: "iris",
    handoff: "the single idea he has grabbed, coming out with the camera",
    lead: 1.5,
  },
  {
    kind: "live",
    scene: "fold",
    beat: 130,
    cut: "continue",
    handoff: "a glowing cube tumbling toward the lens",
    lead: 1,
  },
  {
    kind: "live",
    scene: "cube",
    beat: 140,
    cut: "through",
    handoff: "the inside of the cube, opening out",
    lead: 1,
  },
  {
    kind: "live",
    scene: "pixel",
    beat: 148,
    cut: "pullback",
    handoff: "the real portfolio, him standing in it",
    lead: 1,
  },
  {
    kind: "live",
    scene: "signoff",
    beat: 162,
    cut: "wipe",
    handoff: "black",
    lead: 1,
  },
];

export const ACT2_END = 176;

export type Act2Caption = {
  beat: number;
  outBeat: number;
  text: string;
  kind: "huge" | "wide" | "stamp" | "name" | "role" | "cta" | "whisper";
};

/**
 * Captions are placed against the picture event they belong to, so each one
 * has to sit inside its own shot's window — `undefined` under the platform he
 * steps on, `git revert` under the command palette.
 */
export const ACT2_CAPTIONS: Act2Caption[] = [
  { beat: 35, outBeat: 37.5, text: "undefined", kind: "stamp" }, // as the floor goes
  { beat: 55, outBeat: 56.5, text: "git revert", kind: "stamp" }, // in a2_chase
  { beat: 71, outBeat: 76, text: "IDEA → PRODUCT", kind: "wide" }, // in realities
  { beat: 109, outBeat: 110.5, text: "…yeah.", kind: "whisper" }, // peak chaos
  { beat: 155, outBeat: 160, text: "YOU HAVE THE IDEA.", kind: "wide" }, // in pixel
  { beat: 164, outBeat: 169, text: "I'LL FIGURE OUT THE REST.", kind: "wide" },
  { beat: 170, outBeat: 176, text: "ABDERRAHMANE BAALLA", kind: "name" },
  { beat: 171, outBeat: 176, text: "LET'S BUILD SOMETHING.", kind: "cta" },
];

/**
 * The snap, and the silence it makes. Exported so the picture and the score
 * cannot disagree about when the universe stops.
 */
export const FREEZE_IN = 112;
export const FREEZE_OUT = 120;

export const ms2 = (beat: number) => Math.round(beat * BEAT);

/**
 * The Act 2 score — one continuous piece, not a playlist.
 *
 * The bed changes intensity across the act but never restarts, and every cut
 * is led into: the hit that carries a transition is scheduled `lead` beats
 * *before* the picture changes (a J-cut), with a tail scheduled after it (an
 * L-cut), so the sound is what makes two separate pieces of footage feel like
 * one camera move.
 */
export function buildAct2Cues(): [number, Hit][] {
  const cues: [number, Hit][] = [];
  const put = (beat: number, hit: Hit) => cues.push([ms2(beat), hit]);

  // The bass hit that starts the act, off the back of catching the cursor.
  put(0, "drop");

  ACT2.forEach((shot, i) => {
    if (i === 0) return;
    // J-cut: the next world arrives in the ears first.
    put(shot.beat - shot.lead, shot.cut === "iris" ? "portal" : "riser");
    put(shot.beat, cutHit(shot.cut));
    // L-cut: the previous action rings on past the picture change.
    put(shot.beat + 0.5, "whoosh");
  });

  // ── the bed, in movements ───────────────────────────────
  // City: driving.
  for (let b = 14; b < 38; b += 1) {
    put(b, "kick");
    put(b + 0.5, "hat");
    if (b % 2 === 0) put(b, "sub");
  }
  // The fall: everything drops away but the sub.
  for (let b = 38; b < 48; b += 2) put(b, "sub");
  // The chase: double time.
  for (let b = 48; b < 58; b += 0.5) put(b, b % 1 === 0 ? "kick" : "hat");
  // Reality bending: heavy and wide.
  for (let b = 58; b < FREEZE_IN - 3; b += 1) {
    put(b, "kick");
    if (b % 2 === 0) put(b, "sub");
    if (b % 4 === 0) put(b, "impact");
  }

  // ── the freeze: everything stops, including the music ───
  put(FREEZE_IN - 3, "glitch");
  // FREEZE_IN → the lens cut is silence by omission. Nothing is scheduled
  // in that window on purpose; it is the only true silence in the act.
  put(122, "portal");

  // ── the last movement ───────────────────────────────────
  for (let b = 130; b < 155; b += 1) {
    put(b, "kick");
    if (b % 2 === 0) put(b, "sub");
  }
  put(148, "impact"); // the pull-back begins
  put(155, "tail"); // and everything opens out

  // ── sign-off ────────────────────────────────────────────
  put(164, "glasses");
  put(169, "impact");
  put(170, "tail");

  return cues.sort((a, b) => a[0] - b[0]);
}

function cutHit(cut: Cut): Hit {
  switch (cut) {
    case "through":
      return "portal";
    case "shatter":
      return "glitch";
    case "tear":
      return "impact";
    case "freeze":
      return "glitch";
    case "iris":
      return "portal";
    case "pullback":
      return "sub";
    case "drop":
      return "impact";
    default:
      return "impact";
  }
}
