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
 * The entrance shot: he notices the arrow cursor, snatches it, and hauls the
 * page open with it.
 *
 * Read from the file itself: 5.042s, 1280x720, H.264, no audio track — so the
 * sound-blocked path never fires for this asset, though it stays in place for
 * a future one that has audio.
 *
 * This is the same take Act 2 opens on, and deliberately one file rather than
 * two copies: whoever watches both sees the entrance again as the film starts,
 * which reads as a callback rather than a repeat.
 *
 * `portalStartFromEnd` is the one number that could not be read here: this
 * environment has no H.264 decoder, so the frame where the tear begins to
 * bloom could not be observed. 1.3s is taken from the shot's own structure —
 * notice, snatch, haul, then the gap opening through the last stretch — and it
 * is a single number to nudge if the hand-over feels early or late.
 *
 * The gap opens on the right of frame, which is why the portal is centred
 * there rather than in the middle: the hole grows from where the tear is.
 */
export const INTRO: IntroClip = {
  mode: "scene",
  src: "/clips/a2_cursor_pull.mp4",
  portalStartFromEnd: 1.3,
  portalStartAt: null,
  focal: { x: 0.68, y: 0.5 },
  transitionMs: 1500,
};

/** What the file says, so code never has to guess while it loads. */
export const INTRO_DURATION_S = 5.042;

/** Once per browsing session, not once per navigation. */
export const SEEN_KEY = "intro-seen";
