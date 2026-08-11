"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { FRAGMENTS } from "@/data/brainThoughts";

/**
 * The trip inward: pieces of the work rush past the camera.
 *
 * Everything is a plain div on a CSS 3D plane — no WebGL — so a mid-range
 * phone renders it on the compositor instead of the main thread. Count and
 * depth are tuned per device by the caller.
 */
export default function Tunnel({
  count,
  direction = "in",
}: {
  count: number;
  /** "in" travels toward the mind, "out" is the way home. */
  direction?: "in" | "out";
}) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        text: FRAGMENTS[i % FRAGMENTS.length],
        // Spread around the centre, avoiding a dead middle so the camera
        // always has something passing close by.
        x: (Math.random() * 2 - 1) * 46 + (Math.random() > 0.5 ? 8 : -8),
        y: (Math.random() * 2 - 1) * 42,
        z: -400 - Math.random() * 1600,
        delay: Math.random() * 1.1,
        dur: 1.1 + Math.random() * 0.9,
        size: 0.7 + Math.random() * 1.1,
        wire: i % 7 === 0,
      })),
    [count]
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ perspective: "620px", perspectiveOrigin: "50% 50%" }}
    >
      {bits.map((b, i) => (
        <motion.div
          key={i}
          className={
            b.wire
              ? "absolute left-1/2 top-1/2 rounded-md border border-accent/50"
              : "absolute left-1/2 top-1/2 whitespace-nowrap font-mono text-accent-soft"
          }
          style={{
            fontSize: `${b.size}rem`,
            width: b.wire ? 120 : undefined,
            height: b.wire ? 78 : undefined,
          }}
          initial={{
            x: `${b.x}vw`,
            y: `${b.y}vh`,
            z: direction === "in" ? b.z : 300,
            opacity: 0,
          }}
          animate={{
            z: direction === "in" ? 340 : b.z,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: b.dur,
            delay: b.delay,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.15, 0.7, 1],
          }}
        >
          {b.wire ? null : b.text}
        </motion.div>
      ))}

      {/* speed streaks toward the vanishing point */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(139,124,255,0.22), transparent 58%)",
        }}
      />
    </div>
  );
}
