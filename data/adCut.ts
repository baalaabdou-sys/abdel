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

// Every shot here is 5.0417s of footage (read from the source files). At
// 120bpm a 10-beat window is exactly 5.000s — 42ms short of the clip, and in
// practice more than that once playback start latency is counted in, so the
// last frames of every single shot were never seen. 11 beats (5.5s) gives
// each shot enough room to finish before the next one cuts in.
export const SCENES: Scene[] = [
  { clip: "ad_open", beat: 0, enter: "cut" },
  { clip: "ad_dev", beat: 11, enter: "whip", dir: -1 },
  { clip: "ad_web", beat: 22, enter: "flash" },
  { clip: "ad_apps", beat: 33, enter: "through" },
  { clip: "ad_qr", beat: 44, enter: "spin" },
  { clip: "ad_ai", beat: 55, enter: "through" },
  { clip: "ad_montage", beat: 66, enter: "glitch" },
  { clip: "ad_hero", beat: 77, enter: "cut" },
];

/** Beat the film ends on. */
export const END_BEAT = 88;
/** Where the music stops dead and the hero shot breathes. */
export const SILENCE_BEAT = 77;

export type Caption = {
  beat: number;
  outBeat: number;
  text: string;
  kind: "huge" | "wide" | "stamp" | "name" | "role" | "cta";
};

export const CAPTIONS: Caption[] = [
  { beat: 13, outBeat: 19, text: "I BUILD.", kind: "huge" },
  { beat: 24, outBeat: 30, text: "WEB.", kind: "huge" },
  { beat: 35, outBeat: 41, text: "APPS.", kind: "huge" },
  { beat: 50, outBeat: 53, text: "✓ SCAN SUCCESSFUL", kind: "stamp" },
  { beat: 58, outBeat: 63, text: "IDEAS → PRODUCTS", kind: "wide" },
  { beat: 80, outBeat: 88, text: "ABDERRAHMANE BAALLA", kind: "name" },
  { beat: 81, outBeat: 88, text: "FULL-STACK & SOFTWARE DEVELOPER", kind: "role" },
  { beat: 83, outBeat: 88, text: "LET'S BUILD SOMETHING.", kind: "cta" },
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
  put(13, "ui"); // I BUILD.
  put(24, "ui"); // WEB.
  put(35, "ui"); // APPS.
  put(50, "ui"); // scan confirmed
  put(58, "ui"); // IDEAS → PRODUCTS
  put(66, "glitch"); // the montage arrives
  // visual percussion: the montage is cut on the half beat
  for (let b = 66; b < 77; b += 0.5) put(b, b % 1 === 0 ? "keys" : "click");

  // ── silence, then the hero ──────────────────────────
  put(SILENCE_BEAT, "tail");
  put(80, "glasses");
  put(83, "impact"); // LET'S BUILD SOMETHING.

  return cues.sort((a, b) => a[0] - b[0]);
}
