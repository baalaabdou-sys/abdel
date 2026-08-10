"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAvatarAnchor, useAvatarContext } from "./avatar/AvatarContext";

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
  const { requestAction } = useAvatarContext();
  const anchorRef = useAvatarAnchor("skills", { basePose: "idle_loop", size: 220 });

  const handleActivate = (s: (typeof skills)[number] | null) => {
    setActive(s);
    if (s) requestAction("skills_tap", { flip: s.angle > 180, holdMs: 1800 });
  };

  return (
    <section id="skills" className="relative border-t border-ink-line bg-ink px-6 py-28">
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

          {skills.map((s) => {
            const rad = (s.angle * Math.PI) / 180;
            const x = Math.cos(rad) * RADIUS;
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
                style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, translate: "-50% -50%" }}
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
