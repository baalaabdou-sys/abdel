"use client";

import { motion } from "framer-motion";

/**
 * His signature teleport ring. Drawn as concentric arcs so it reads as
 * "digital" rather than a plain glow, and animated purely with transform +
 * opacity so it stays cheap on a phone.
 */
export default function Portal({
  size = 260,
  open,
  className = "",
}: {
  size?: number;
  open: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={`pointer-events-none absolute ${className}`}
      style={{ width: size, height: size, translateX: "-50%", translateY: "-50%" }}
      initial={false}
      animate={open ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 rounded-full bg-accent/25 blur-2xl" />
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        animate={open ? { rotate: 360 } : {}}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B7CFF" />
            <stop offset="100%" stopColor="#5EE6D0" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" fill="none" stroke="url(#pg)" strokeWidth="3" opacity="0.9" />
        <circle
          cx="100"
          cy="100"
          r="74"
          fill="none"
          stroke="url(#pg)"
          strokeWidth="2"
          strokeDasharray="14 10"
          opacity="0.75"
        />
        <circle
          cx="100"
          cy="100"
          r="58"
          fill="none"
          stroke="#5EE6D0"
          strokeWidth="1.5"
          strokeDasharray="4 12"
          opacity="0.6"
        />
      </motion.svg>
      <motion.div
        className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(139,124,255,0.55),rgba(11,14,26,0.9))]"
        animate={open ? { scale: [0.94, 1.04, 0.94] } : {}}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
