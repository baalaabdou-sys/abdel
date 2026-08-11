"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

type Path = "center" | "leftSpin" | "fill" | "rightSpin" | "centerMouse";

const TECH: { label: string; path: Path; delay: number }[] = [
  { label: "React", path: "center", delay: 0.7 },
  { label: "Python", path: "leftSpin", delay: 1.7 },
  { label: "TypeScript", path: "fill", delay: 2.7 },
  { label: "Next.js", path: "center", delay: 3.6 },
  { label: "SQL", path: "rightSpin", delay: 4.4 },
  { label: "AI", path: "centerMouse", delay: 5.2 },
];

const VARIANTS: Record<Path, { keyframes: Record<string, number[]>; times: number[]; duration: number }> = {
  center: {
    keyframes: {
      x: [30, 10, -10],
      y: [10, -10, -30],
      scale: [0.25, 2.2, 7.5],
      opacity: [0, 1, 0],
      rotate: [-6, 2, 4],
      blur: [0, 3, 34],
    },
    times: [0, 0.45, 1],
    duration: 1.3,
  },
  leftSpin: {
    keyframes: {
      x: [40, -30, -130],
      y: [20, -10, -60],
      scale: [0.25, 1.8, 3.2],
      opacity: [0, 1, 0],
      rotate: [0, 200, 380],
      blur: [0, 2, 22],
    },
    times: [0, 0.5, 1],
    duration: 1.2,
  },
  rightSpin: {
    keyframes: {
      x: [-30, 25, 125],
      y: [30, 0, -30],
      scale: [0.25, 1.8, 3.2],
      opacity: [0, 1, 0],
      rotate: [0, -180, -360],
      blur: [0, 2, 22],
    },
    times: [0, 0.5, 1],
    duration: 1.2,
  },
  fill: {
    keyframes: {
      x: [20, 0, -10],
      y: [30, 0, -20],
      scale: [0.25, 3.4, 9],
      opacity: [0, 0.9, 0],
      rotate: [-4, 0, 2],
      blur: [0, 2, 20],
    },
    times: [0, 0.55, 1],
    duration: 1.4,
  },
  centerMouse: {
    keyframes: {
      x: [20, 0, -20],
      y: [10, -10, -30],
      scale: [0.25, 2, 5.5],
      opacity: [0, 1, 0],
      rotate: [-6, 3, 6],
      blur: [0, 3, 26],
    },
    times: [0, 0.5, 1],
    duration: 1.3,
  },
};

function TechCard({ label, path, delay, active }: { label: string; path: Path; delay: number; active: boolean }) {
  const v = VARIANTS[path];
  const cardRef = useRef<HTMLDivElement>(null);
  const nudgeX = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 });
  const nudgeY = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 });
  const mouseReactive = path === "centerMouse";

  useEffect(() => {
    if (!active || !mouseReactive) return;
    const onMove = (e: PointerEvent) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - e.clientX;
      const dy = cy - e.clientY;
      const dist = Math.hypot(dx, dy);
      if (dist < 140 && dist > 0) {
        const force = (140 - dist) / 140;
        nudgeX.set((dx / dist) * force * 60);
        nudgeY.set((dy / dist) * force * 60);
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [active, mouseReactive, nudgeX, nudgeY]);

  if (!active) return null;

  return (
    <motion.div
      ref={cardRef}
      className="absolute left-1/2 top-1/2"
      style={{ x: nudgeX, y: nudgeY }}
      initial={{ x: v.keyframes.x[0], y: v.keyframes.y[0], scale: v.keyframes.scale[0], opacity: 0 }}
      animate={{
        x: v.keyframes.x.map((n) => `calc(${n}vw)`),
        y: v.keyframes.y.map((n) => `calc(${n}vh)`),
        scale: v.keyframes.scale,
        opacity: v.keyframes.opacity,
        rotate: v.keyframes.rotate,
        filter: v.keyframes.blur.map((b) => `blur(${b}px)`),
      }}
      transition={{ duration: v.duration, delay, times: v.times, ease: "easeOut" }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-accent-soft/40 bg-gradient-to-br from-accent/25 via-ink-soft/60 to-accent-soft/15 px-6 py-3.5 font-mono text-base font-semibold sm:text-lg text-paper shadow-[0_0_40px_rgba(139,124,255,0.35)] backdrop-blur-md">
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/15 via-transparent to-transparent" />
        {label}
      </div>
    </motion.div>
  );
}

export default function TechThrowFX({ active }: { active: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (active && !prefersReducedMotion) setMounted(true);
  }, [active, prefersReducedMotion]);

  if (prefersReducedMotion || !mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {TECH.map((t) => (
        <TechCard key={t.label} label={t.label} path={t.path} delay={t.delay} active={active} />
      ))}
    </div>
  );
}
