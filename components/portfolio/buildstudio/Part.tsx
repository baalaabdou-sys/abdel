"use client";

import { motion } from "framer-motion";
import { useSafeReducedMotion } from "../avatar/useSafeReducedMotion";

/**
 * One piece of the interface being built, thrown into place.
 *
 * These don't fade in — each part comes in from off-screen or straight past
 * the camera, oversized and motion-blurred, then overshoots and settles. The
 * assembly is the reveal, so it has to read as construction rather than a
 * transition.
 */
export default function Part({
  i,
  children,
  className = "",
  from = "up",
}: {
  i: number;
  children?: React.ReactNode;
  className?: string;
  from?: "up" | "down" | "left" | "right" | "front";
}) {
  const prefersReducedMotion = useSafeReducedMotion();

  const entries: Record<string, { x?: string; y?: string; scale: number; rotate: number }> = {
    // Hurled in from beyond the edge of the screen.
    left: { x: "-85vw", scale: 1.5, rotate: -22 },
    right: { x: "85vw", scale: 1.5, rotate: 22 },
    up: { y: "55vh", scale: 1.35, rotate: -8 },
    down: { y: "-55vh", scale: 1.35, rotate: 8 },
    // Comes at you and lands — passes the camera on the way in.
    front: { scale: 4.6, rotate: 3 },
  };
  const from_ = entries[from];

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        x: from_.x ?? 0,
        y: from_.y ?? 0,
        scale: from_.scale,
        rotate: from_.rotate,
        filter: "blur(14px)",
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        // Slight overshoot on the way to rest, so it lands with weight.
        scale: [from_.scale, 1.06, 1],
        rotate: [from_.rotate, -from_.rotate * 0.12, 0],
        filter: ["blur(14px)", "blur(2px)", "blur(0px)"],
      }}
      transition={{
        duration: 0.72,
        delay: 0.15 + i * 0.14,
        times: [0, 0.72, 1],
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function Bar({ w = "100%", h = 10, dim = false }: { w?: string; h?: number; dim?: boolean }) {
  return (
    <div
      className={`rounded-full ${dim ? "bg-ink-line" : "bg-haze/35"}`}
      style={{ width: w, height: h }}
    />
  );
}
