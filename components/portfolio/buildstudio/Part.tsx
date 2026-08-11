"use client";

import { motion } from "framer-motion";
import { useSafeReducedMotion } from "../avatar/useSafeReducedMotion";

/**
 * One piece of a mockup flying into place. Pieces animate in sequence so the
 * interface visibly assembles itself rather than just fading in as a unit.
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
  // Structural swap (div vs motion.div) must be hydration-safe.
  const prefersReducedMotion = useSafeReducedMotion();

  const offsets: Record<string, { x?: number; y?: number; scale?: number }> = {
    up: { y: 34 },
    down: { y: -34 },
    left: { x: -46 },
    right: { x: 46 },
    front: { scale: 1.7 },
  };
  const off = offsets[from];

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: "blur(7px)", ...off }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.5,
        delay: 0.25 + i * 0.13,
        ease: [0.22, 1, 0.36, 1],
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
