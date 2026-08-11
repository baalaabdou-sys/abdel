"use client";

import { motion } from "framer-motion";
import type { Cut } from "@/data/act2";

/**
 * The transition engine.
 *
 * A cut here is never a dissolve and never passes through black. Each one
 * moves *through* the object that was already filling the frame, which is why
 * every shot in the chain declares its handoff object.
 *
 * Two layers are always live: the shot going out and the shot coming in. The
 * incoming layer is mounted and already running before its own beat (see
 * PREROLL in the player), so at the moment of the cut both layers are in
 * motion — that is what removes the "a video ended and another started"
 * feeling. The functions below only describe *how the frame is handed over*.
 */

export const PREROLL = 700;

type Phase = "incoming" | "current" | "outgoing";

/** How the shot arriving on this cut enters the frame. */
export function entering(cut: Cut, dir: 1 | -1 = 1) {
  switch (cut) {
    case "through":
      // We are inside the object we just punched through: it opens out around
      // the camera rather than fading up.
      return {
        initial: { scale: 2.65, opacity: 1, filter: "blur(9px)" },
        animate: { scale: 1, opacity: 1, filter: "blur(0px)" },
        transition: { duration: 0.72, ease: [0.19, 1, 0.22, 1] },
      };
    case "wipe":
      return {
        initial: {
          opacity: 1,
          clipPath: dir > 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)",
        },
        animate: { opacity: 1, clipPath: "inset(0 0% 0 0%)" },
        transition: { duration: 0.5, ease: [0.6, 0, 0.2, 1] },
      };
    case "tear":
      // Pulled apart from the middle by his own hands.
      return {
        initial: { opacity: 1, clipPath: "inset(0 50% 0 50%)" },
        animate: { opacity: 1, clipPath: "inset(0 0% 0 0%)" },
        transition: { duration: 0.62, ease: [0.3, 0, 0.1, 1] },
      };
    case "shatter":
      return {
        initial: {
          opacity: 1,
          clipPath: "polygon(48% 0, 52% 0, 56% 50%, 52% 100%, 48% 100%, 44% 50%)",
        },
        animate: {
          opacity: 1,
          clipPath: "polygon(0 0, 100% 0, 100% 50%, 100% 100%, 0 100%, 0 50%)",
        },
        transition: { duration: 0.46, ease: [0.7, 0, 0.3, 1] },
      };
    case "iris":
      return {
        initial: { opacity: 1, clipPath: "circle(3% at 50% 45%)" },
        animate: { opacity: 1, clipPath: "circle(85% at 50% 45%)" },
        transition: { duration: 0.8, ease: [0.5, 0, 0.2, 1] },
      };
    case "pullback":
      // The frame we were just in becomes a speck inside this one.
      return {
        initial: { scale: 1, opacity: 1 },
        animate: { scale: 1, opacity: 1 },
        transition: { duration: 0.01 },
      };
    case "freeze":
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        transition: { duration: 0 },
      };
    default:
      // "continue" — the camera never changed velocity, so neither does the
      // picture. One frame, no blend, nothing to notice.
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        transition: { duration: 0 },
      };
  }
}

/** How the shot being replaced leaves. It always leaves *past the camera*. */
export function leaving(cut: Cut, dir: 1 | -1 = 1) {
  switch (cut) {
    case "through":
      return {
        animate: { scale: 6.5, opacity: 0, filter: "blur(22px)" },
        transition: { duration: 0.5, ease: [0.6, 0, 0.9, 0.4] },
      };
    case "wipe":
      return {
        animate: { x: `${dir * 12}%`, opacity: 0 },
        transition: { duration: 0.45, ease: [0.6, 0, 0.2, 1] },
      };
    case "tear":
      return {
        animate: { scale: 1.25, opacity: 0 },
        transition: { duration: 0.5, ease: [0.5, 0, 0.2, 1] },
      };
    case "shatter":
      return {
        animate: { scale: 1.6, opacity: 0, filter: "blur(14px)" },
        transition: { duration: 0.35, ease: [0.8, 0, 0.4, 1] },
      };
    case "pullback":
      // Shrinks to the pixel it was always inside.
      return {
        animate: { scale: 0.001, opacity: 1 },
        transition: { duration: 1.6, ease: [0.4, 0, 0.2, 1] },
      };
    case "iris":
      return {
        animate: { scale: 1.35, opacity: 0 },
        transition: { duration: 0.6, ease: [0.5, 0, 0.2, 1] },
      };
    default:
      return {
        animate: { opacity: 0 },
        transition: { duration: 0, delay: 0.001 },
      };
  }
}

/**
 * One layer of the stack. Layers are stacked by recency, and only the one
 * arriving animates — the rest sit still or are on their way past the lens.
 */
export default function CutLayer({
  phase,
  cut,
  dir = 1,
  z,
  children,
}: {
  phase: Phase;
  cut: Cut;
  dir?: 1 | -1;
  z: number;
  children: React.ReactNode;
}) {
  const enter = entering(cut, dir);
  const exit = leaving(cut, dir);

  return (
    <motion.div
      className="absolute inset-0 origin-center"
      // Hidden with `visibility`, never with opacity: an incoming shot is
      // already mounted, already running and already posed at its entry
      // transform, so being handed the frame costs one instant flip and no
      // fade. Ramping opacity here would turn every cut into a dissolve,
      // which is the one thing this engine exists to avoid.
      style={{ zIndex: z, visibility: phase === "incoming" ? "hidden" : "visible" }}
      initial={enter.initial}
      animate={
        phase === "outgoing"
          ? exit.animate
          : phase === "incoming"
          ? enter.initial
          : enter.animate
      }
      transition={
        phase === "outgoing"
          ? exit.transition
          : phase === "incoming"
          ? { duration: 0 }
          : enter.transition
      }
    >
      {children}
    </motion.div>
  );
}
