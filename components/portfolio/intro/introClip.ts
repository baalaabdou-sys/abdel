import type { ClipKey } from "../avatar/clips";

/**
 * The opening shot, and the single frame the whole transition hangs off.
 *
 * `portalStartFromEnd` is measured backwards from the end of the clip on
 * purpose: the real duration is read from the video at runtime, never
 * assumed, so this stays correct if the asset is swapped for a longer or
 * shorter take. Set `portalStartAt` if you would rather pin it to an absolute
 * second — it wins when present.
 */
export type IntroClip = {
  /**
   * "scene" plays the file full frame. "chroma" keys the green out and
   * composites him over the environment below, which is what the existing
   * character clips need.
   */
  mode: "scene" | "chroma";
  /** Used when mode is "scene". */
  src?: string;
  /** Used when mode is "chroma". */
  clip?: ClipKey;
  /** Seconds before the end at which the portal starts to open. */
  portalStartFromEnd: number;
  /** Absolute second to start the portal instead. Overrides the above. */
  portalStartAt: number | null;
  /** Where the portal sits in frame, 0–1. The transition opens from here. */
  focal: { x: number; y: number };
  /** How long the portal takes to swallow the screen. */
  transitionMs: number;
};

/**
 * PLACEHOLDER — this is not the arrow-and-portal take.
 *
 * That clip is not in the generation history, so this is wired to the closest
 * thing that exists (he draws a circle in the air and steps through it) purely
 * so the entrance runs end to end today. Swapping in the real file is this
 * object and nothing else: for a finished scene set mode "scene" and a src,
 * and set portalStartFromEnd to the moment the portal begins to bloom.
 */
export const INTRO: IntroClip = {
  mode: "chroma",
  clip: "portal_enter",
  portalStartFromEnd: 1.5,
  portalStartAt: null,
  focal: { x: 0.5, y: 0.46 },
  transitionMs: 1600,
};

/** Once per browsing session, not once per navigation. */
export const SEEN_KEY = "intro-seen";
