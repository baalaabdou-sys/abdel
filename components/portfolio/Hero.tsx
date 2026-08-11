"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAvatarAnchor, useAvatarContext } from "./avatar/AvatarContext";
import MagneticButton from "./MagneticButton";
import WatchAdButton from "./ad/WatchAdButton";
import TechThrowFX from "./TechThrowFX";
import ChromaClip from "./avatar/ChromaClip";
import { useCapability } from "./avatar/useCapability";
import { useMalfunction } from "./avatar/useMalfunction";
import { useSafeReducedMotion } from "./avatar/useSafeReducedMotion";
import { usePhysicsBody } from "./physics/PhysicsContext";

const ENTRANCE_HOLD_MS = 6800;

/** A hero chip that can be knocked out of the air by a thrown technology. */
function Floater({ label, top, left, delay }: { label: string; top: string; left: string; delay: number }) {
  const body = usePhysicsBody();
  return (
    <motion.div
      ref={body.ref as React.Ref<HTMLDivElement>}
      className="absolute hidden select-none items-center justify-center rounded-xl border border-ink-line bg-ink-soft/70 px-3 py-2 font-mono text-xs text-accent-soft shadow-soft backdrop-blur sm:flex"
      style={{ top, left, ...body.style }}
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 5, repeat: Infinity, delay, ease: "easeInOut" }}
    >
      {label}
    </motion.div>
  );
}

const floaters = [
  { label: "</>", top: "14%", left: "6%", delay: 0 },
  { label: "{ }", top: "68%", left: "10%", delay: 0.6 },
  { label: "AI", top: "22%", left: "82%", delay: 0.3 },
  { label: "npm", top: "78%", left: "80%", delay: 0.9 },
];

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();
  // Structural conditionals below must use the hydration-safe variant.
  const safeReduced = useSafeReducedMotion();
  const { play } = useAvatarContext();
  const anchorRef = useAvatarAnchor("hero", { basePose: "idle", size: 640 });
  const [entranceActive, setEntranceActive] = useState(false);
  const [miniWalk, setMiniWalk] = useState(false);
  const cap = useCapability();
  useMalfunction(!prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const start = setTimeout(() => {
      play("arriving", { holdMs: ENTRANCE_HOLD_MS });
      setEntranceActive(true);
    }, 300);
    const stop = setTimeout(() => setEntranceActive(false), 300 + ENTRANCE_HOLD_MS);
    // A beat after he settles, a tiny version of him strolls across the name.
    const mini = setTimeout(() => setMiniWalk(true), 300 + ENTRANCE_HOLD_MS + 2200);
    const miniOff = setTimeout(() => setMiniWalk(false), 300 + ENTRANCE_HOLD_MS + 12000);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
      clearTimeout(mini);
      clearTimeout(miniOff);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReducedMotion]);

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden bg-ink pt-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(139,124,255,0.16),transparent_55%)]" />
      <TechThrowFX active={entranceActive} />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10" data-rb-scatter data-rb-tag="<Hero />" data-rb-order="10">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-line bg-ink-soft/60 px-4 py-1.5 text-xs font-medium tracking-wide text-accent-soft"
          >
            Full-Stack &amp; Software Developer
          </motion.p>

          <motion.h1
            data-glitchable
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative max-w-xl font-display text-5xl font-semibold leading-[1.05] text-paper sm:text-6xl"
          >
            Abderrahmane Baalla
            {/* Mini mode: he shrinks and walks the length of the name, then
                hops off. No explanation, no label — just there if you look. */}
            {miniWalk && !safeReduced && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -top-11 left-0 block w-14"
                initial={{ x: "-10%", opacity: 0 }}
                animate={{ x: ["-10%", "560%", "560%"], opacity: [0, 1, 1] }}
                transition={{ duration: 9, times: [0, 0.85, 1], ease: "linear" }}
              >
                <span className="relative block w-full" style={{ paddingTop: "133%" }}>
                  <span className="absolute inset-0 block">
                    <ChromaClip clip="idle_loop" cap={cap} />
                  </span>
                </span>
              </motion.span>
            )}
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

          {/* The trailer. Nothing about it loads until it is asked for. */}
          <WatchAdButton />
        </div>

        <div className="relative z-0 flex justify-center lg:justify-end">
          {!safeReduced && floaters.map((f) => <Floater key={f.label} {...f} />)}

          <div ref={anchorRef} className="h-[30rem] w-[24rem] sm:h-[38rem] sm:w-[32rem]" />
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
