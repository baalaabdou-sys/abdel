"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Avatar from "./avatar/Avatar";
import MagneticButton from "./MagneticButton";
import type { Pose } from "./avatar/poses";

const floaters = [
  { label: "</>", top: "14%", left: "6%", delay: 0 },
  { label: "{ }", top: "68%", left: "10%", delay: 0.6 },
  { label: "AI", top: "22%", left: "82%", delay: 0.3 },
  { label: "npm", top: "78%", left: "80%", delay: 0.9 },
];

const IDLE_TIMEOUT = 14000;

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const [pose, setPose] = useState<Pose>("waving");
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const t = setTimeout(() => setPose("idle"), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const scheduleIdle = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        const eggs: Pose[] = ["thinking", "typing"];
        const egg = eggs[Math.floor(Math.random() * eggs.length)];
        setPose(egg);
        setTimeout(() => setPose("idle"), 2800);
      }, IDLE_TIMEOUT);
    };

    scheduleIdle();
    const reset = () => scheduleIdle();
    window.addEventListener("pointermove", reset);
    window.addEventListener("scroll", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(idleTimer.current);
      window.removeEventListener("pointermove", reset);
      window.removeEventListener("scroll", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [prefersReducedMotion]);

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden bg-ink pt-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(139,124,255,0.16),transparent_55%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-line bg-ink-soft/60 px-4 py-1.5 text-xs font-medium tracking-wide text-accent-soft"
          >
            Full-Stack &amp; Software Developer
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-xl font-display text-5xl font-semibold leading-[1.05] text-paper sm:text-6xl"
          >
            Abderrahmane Baalla
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-lg text-lg leading-relaxed text-haze"
          >
            I build web apps, backends, and mobile tools that solve real
            problems — from digital menus and AI-sorted photo pipelines to
            biometric attendance systems and internal business software.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <MagneticButton
              href="#work"
              className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-soft"
            >
              See my work
            </MagneticButton>
            <MagneticButton
              href="#contact"
              className="inline-flex rounded-full border border-ink-line px-6 py-3 text-sm font-semibold text-paper transition hover:border-accent hover:text-accent"
            >
              Get in touch
            </MagneticButton>
          </motion.div>
        </div>

        <div className="relative z-0 flex justify-center lg:justify-end">
          {!prefersReducedMotion &&
            floaters.map((f) => (
              <motion.div
                key={f.label}
                className="absolute hidden select-none items-center justify-center rounded-xl border border-ink-line bg-ink-soft/70 px-3 py-2 font-mono text-xs text-accent-soft shadow-soft backdrop-blur sm:flex"
                style={{ top: f.top, left: f.left }}
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 5, repeat: Infinity, delay: f.delay, ease: "easeInOut" }}
              >
                {f.label}
              </motion.div>
            ))}

          <Avatar pose={pose} size="xl" trackCursor className="relative" />
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-haze/60">
        <motion.div
          animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="h-9 w-5 rounded-full border border-ink-line"
        >
          <div className="mx-auto mt-2 h-1.5 w-1.5 rounded-full bg-accent-soft" />
        </motion.div>
      </div>
    </section>
  );
}
