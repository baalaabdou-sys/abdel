import { BEAT, type Hit } from "@/components/portfolio/ad/score";

/**
 * The edit.
 *
 * Every timestamp is a multiple of the beat, and the score is built from the
 * same grid, so cuts, camera hits and typography land on the music by
 * construction rather than by eye.
 */

export type Transition = "whip" | "flash" | "through" | "spin" | "glitch" | "cut";

export type Scene = {
  clip: AdClipKey;
  /** Beat this scene starts on. */
  beat: number;
  /** How it arrives. */
  enter: Transition;
  /** Direction hint for whips. */
  dir?: 1 | -1;
};

export type AdClipKey =
  | "ad_open"
  | "ad_dev"
  | "ad_web"
  | "ad_apps"
  | "ad_qr"
  | "ad_ai"
  | "ad_montage"
  | "ad_hero";

export const SCENES: Scene[] = [
  { clip: "ad_open", beat: 0, enter: "cut" },
  { clip: "ad_dev", beat: 9, enter: "whip", dir: -1 },
  { clip: "ad_web", beat: 18, enter: "flash" },
  { clip: "ad_apps", beat: 27, enter: "through" },
  { clip: "ad_qr", beat: 36, enter: "spin" },
  { clip: "ad_ai", beat: 45, enter: "through" },
  { clip: "ad_montage", beat: 53, enter: "glitch" },
  { clip: "ad_hero", beat: 59, enter: "cut" },
];

/** Beat the film ends on. */
export const END_BEAT = 71;
/** Where the music stops dead and the hero shot breathes. */
export const SILENCE_BEAT = 59;

export type Caption = {
  beat: number;
  outBeat: number;
  text: string;
  kind: "huge" | "wide" | "stamp" | "name" | "role" | "cta";
};

export const CAPTIONS: Caption[] = [
  { beat: 11, outBeat: 16.5, text: "I BUILD.", kind: "huge" },
  { beat: 20, outBeat: 25.5, text: "WEB.", kind: "huge" },
  { beat: 29, outBeat: 34.5, text: "APPS.", kind: "huge" },
  { beat: 42, outBeat: 44.5, text: "✓ SCAN SUCCESSFUL", kind: "stamp" },
  { beat: 48, outBeat: 52.5, text: "IDEAS → PRODUCTS", kind: "wide" },
  { beat: 62, outBeat: 71, text: "ABDERRAHMANE BAALLA", kind: "name" },
  { beat: 63, outBeat: 71, text: "FULL-STACK & SOFTWARE DEVELOPER", kind: "role" },
  { beat: 66, outBeat: 71, text: "LET'S BUILD SOMETHING.", kind: "cta" },
];

export const ms = (beat: number) => Math.round(beat * BEAT);

/**
 * The score, written as beats. Percussion runs from the drop until the music
 * cuts; everything else is placed against a picture event.
 */
export function buildCues(): [number, Hit][] {
  const cues: [number, Hit][] = [];
  const put = (beat: number, hit: Hit) => cues.push([ms(beat), hit]);

  // ── the dark opening ────────────────────────────────
  put(3.2, "click"); // the glint
  put(4.2, "riser");
  put(6, "drop"); // camera tears backward

  // ── the bed ─────────────────────────────────────────
  for (let b = 6; b < SILENCE_BEAT; b += 1) {
    put(b, "kick");
    put(b + 0.5, "hat");
    if (b % 2 === 0) put(b, "sub");
  }

  // ── one hit per cut, matched to how the cut moves ───
  SCENES.slice(1).forEach((s) => {
    put(s.beat, s.enter === "through" || s.enter === "spin" ? "portal" : "whoosh");
    put(s.beat, "impact");
  });

  // ── picture events ──────────────────────────────────
  put(11, "ui"); // I BUILD.
  put(20, "ui"); // WEB.
  put(29, "ui"); // APPS.
  put(42, "ui"); // scan confirmed
  put(48, "ui"); // IDEAS → PRODUCTS
  put(53, "glitch"); // the montage arrives
  // visual percussion: the montage is cut on the half beat
  for (let b = 53; b < 59; b += 0.5) put(b, b % 1 === 0 ? "keys" : "click");

  // ── silence, then the hero ──────────────────────────
  put(SILENCE_BEAT, "tail");
  put(62, "glasses");
  put(66, "impact"); // LET'S BUILD SOMETHING.

  return cues.sort((a, b) => a[0] - b[0]);
}
