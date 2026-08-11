"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAvatarAnchor, useAvatarContext } from "./avatar/AvatarContext";
import AvatarClones from "./avatar/AvatarClones";

const skills = [
  { label: "React", desc: "Component-driven interfaces", angle: 0 },
  { label: "Next.js", desc: "Full-stack React framework", angle: 51 },
  { label: "TypeScript", desc: "Types that catch bugs early", angle: 102 },
  { label: "Python", desc: "FastAPI backends & automation", angle: 153 },
  { label: "Gemini AI", desc: "Classification & extraction", angle: 204 },
  { label: "SQL", desc: "Data modeling that scales", angle: 255 },
  { label: "REST APIs", desc: "Clean service integrations", angle: 306 },
];

const RADIUS = 190;

export default function Skills() {
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState<(typeof skills)[number] | null>(null);
  const { play } = useAvatarContext();
  const anchorRef = useAvatarAnchor("skills", { basePose: "idle", size: 220 });
  const sectionRef = useRef<HTMLElement>(null);
  const [cloned, setCloned] = useState(false);
  const clonedOnce = useRef(false);

  const handleActivate = (s: (typeof skills)[number] | null) => {
    setActive(s);
    if (s) play("tapping", { flip: s.angle > 180 });
  };

  /**
   * The clone beat. Fires once, a beat after the section settles in view, so
   * it lands as a surprise mid-scroll rather than as a section intro.
   */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || prefersReducedMotion) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || clonedOnce.current) return;
        clonedOnce.current = true;
        const inTimer = setTimeout(() => setCloned(true), 1400);
        const outTimer = setTimeout(() => setCloned(false), 7200);
        return () => {
          clearTimeout(inTimer);
          clearTimeout(outTimer);
        };
      },
      { threshold: 0.55 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="skills"
      className="relative border-t border-ink-line bg-ink px-6 py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-accent">Toolbox</p>
          <h2 className="mt-3 font-display text-4xl text-paper sm:text-5xl">
            What I build with
          </h2>
          <p className="mt-4 text-haze">Hover a technology to see how I use it.</p>
        </div>

        <div className="relative mx-auto flex h-[420px] max-w-xl items-center justify-center sm:h-[480px]">
          <div ref={anchorRef} className="h-40 w-32" />
          <AvatarClones active={cloned} />

          {skills.map((s) => {
            const rad = (s.angle * Math.PI) / 180;
            // Percentage-based so the orbit always fits its container — a
            // fixed pixel radius pushed the icons off the side of a phone.
            const x = Math.cos(rad) * 50;
            const y = Math.sin(rad) * RADIUS;
            const isActive = active?.label === s.label;

            return (
              <motion.button
                key={s.label}
                type="button"
                data-cursor-hover
                onMouseEnter={() => handleActivate(s)}
                onMouseLeave={() => handleActivate(null)}
                onFocus={() => handleActivate(s)}
                onBlur={() => handleActivate(null)}
                className={`absolute flex h-16 w-16 items-center justify-center rounded-2xl border text-[11px] font-semibold transition-colors sm:h-20 sm:w-20 sm:text-xs ${
                  isActive
                    ? "border-accent bg-accent text-ink"
                    : "border-ink-line bg-ink-soft text-paper hover:border-accent/60"
                }`}
                style={{
                  // Horizontal position tracks the container width so the
                  // orbit can never push past the edge of a narrow screen.
                  left: `calc(50% + ${x}% - ${x * 0.5}px)`,
                  top: `calc(50% + ${y}px)`,
                  translate: "-50% -50%",
                }}
                animate={prefersReducedMotion ? {} : { y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: s.angle / 100 }}
              >
                {s.label}
              </motion.button>
            );
          })}
        </div>

        <div className="mx-auto mt-4 h-8 max-w-xl text-center text-sm text-accent-soft">
          {active ? `${active.label} — ${active.desc}` : ""}
        </div>
      </div>
    </section>
  );
}
