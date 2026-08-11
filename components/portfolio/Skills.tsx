"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAvatarAnchor, useAvatarContext } from "./avatar/AvatarContext";
import AvatarClones from "./avatar/AvatarClones";
import { usePhysics, usePhysicsBody } from "./physics/PhysicsContext";

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
  const physics = usePhysics();
  const anchorRef = useAvatarAnchor("skills", { basePose: "idle", size: 340 });
  const sectionRef = useRef<HTMLElement>(null);
  const [cloned, setCloned] = useState(false);
  
  const handleActivate = (s: (typeof skills)[number] | null) => {
    setActive(s);
    if (s) play("tapping", { flip: s.angle > 180 });
  };

  /**
   * The clone beat. Fires every time the section comes into view — rare
   * enough to surprise, frequent enough that visitors actually see it.
   */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || prefersReducedMotion) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        const inTimer = setTimeout(() => setCloned(true), 1400);
        // The clone that throws actually connects: the orbit gets shoved.
        const hit1 = setTimeout(() => {
          const r = sectionRef.current?.getBoundingClientRect();
          if (r && physics) physics.impulse(r.left + r.width * 0.16, r.top + r.height * 0.62, 96);
        }, 2600);
        const hit2 = setTimeout(() => {
          const r = sectionRef.current?.getBoundingClientRect();
          if (r && physics) physics.impulse(r.left + r.width * 0.84, r.top + r.height * 0.58, 82);
        }, 4100);
        const outTimer = setTimeout(() => setCloned(false), 9000);
        return () => {
          clearTimeout(inTimer);
          clearTimeout(outTimer);
          clearTimeout(hit1);
          clearTimeout(hit2);
        };
      },
      { threshold: 0.55 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReducedMotion, physics]);

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

          {skills.map((s) => (
            <SkillOrb
              key={s.label}
              skill={s}
              active={active?.label === s.label}
              reduced={prefersReducedMotion}
              onActivate={handleActivate}
            />
          ))}
        </div>

        <div className="mx-auto mt-4 h-8 max-w-xl text-center text-sm text-accent-soft">
          {active ? `${active.label} — ${active.desc}` : ""}
        </div>
      </div>
    </section>
  );
}

/** An orbiting technology that can be physically knocked around. */
function SkillOrb({
  skill,
  active,
  reduced,
  onActivate,
}: {
  skill: (typeof skills)[number];
  active: boolean;
  reduced: boolean | null;
  onActivate: (s: (typeof skills)[number] | null) => void;
}) {
  const body = usePhysicsBody();
  const rad = (skill.angle * Math.PI) / 180;
  // Percentage-based so the orbit always fits its container.
  const x = Math.cos(rad) * 50;
  const y = Math.sin(rad) * RADIUS;

  return (
    <motion.button
      ref={body.ref as React.Ref<HTMLButtonElement>}
      type="button"
      data-cursor-hover
      onMouseEnter={() => onActivate(skill)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(skill)}
      onBlur={() => onActivate(null)}
      className={`absolute flex h-16 w-16 items-center justify-center rounded-2xl border text-[11px] font-semibold transition-colors sm:h-20 sm:w-20 sm:text-xs ${
        active
          ? "border-accent bg-accent text-ink"
          : "border-ink-line bg-ink-soft text-paper hover:border-accent/60"
      }`}
      style={{
        left: `calc(50% + ${x}% - ${x * 0.5}px)`,
        top: `calc(50% + ${y}px)`,
        translate: "-50% -50%",
        ...body.style,
      }}
      animate={reduced ? {} : { scale: [1, 1.04, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: skill.angle / 100 }}
    >
      {skill.label}
    </motion.button>
  );
}
