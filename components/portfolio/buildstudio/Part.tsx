"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSafeReducedMotion } from "../avatar/useSafeReducedMotion";

/**
 * One piece of the interface being built, thrown into place.
 *
 * These don't fade in — each piece is hurled in from beyond the edge of the
 * screen, or comes straight past the camera, then overshoots and settles. The
 * assembly is the reveal, so it has to read as construction.
 *
 * Offsets are real pixels derived from the viewport: framer-motion does not
 * parse vw/vh units for x/y, and passing them silently produces no movement
 * at all.
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
  const [vp, setVp] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const entries: Record<string, { x: number; y: number; scale: number; rotate: number }> = {
    left: { x: -vp.w * 0.75, y: 0, scale: 1.45, rotate: -20 },
    right: { x: vp.w * 0.75, y: 0, scale: 1.45, rotate: 20 },
    up: { x: 0, y: vp.h * 0.5, scale: 1.3, rotate: -7 },
    down: { x: 0, y: -vp.h * 0.5, scale: 1.3, rotate: 7 },
    // Comes at you and lands — passes the camera on the way in.
    front: { x: 0, y: 0, scale: 4.6, rotate: 3 },
  };
  const f = entries[from];

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: f.x, y: f.y, scale: f.scale, rotate: f.rotate, filter: "blur(14px)" }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        // Slight overshoot on the way to rest, so it lands with weight.
        scale: [f.scale, 1.06, 1],
        rotate: [f.rotate, -f.rotate * 0.12, 0],
        filter: ["blur(14px)", "blur(2px)", "blur(0px)"],
      }}
      transition={{
        duration: 0.78,
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
