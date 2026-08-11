"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Project } from "@/data/projects";
import { useAvatarContext } from "./avatar/AvatarContext";
import PortalTakeover, { type TakeoverOrigin } from "./avatar/PortalTakeover";

/** How long the takeover runs before the project actually opens. */
const PORTAL_MS = 1150;

export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const { play } = useAvatarContext();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [origin, setOrigin] = useState<TakeoverOrigin | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout>>();
  const flip = index % 3 === 2;

  const navigate = () => {
    if (!project.href) return;
    if (project.internal) router.push(project.href);
    else window.open(project.href, "_blank", "noopener,noreferrer");
    // Clear a beat later so the overlay covers the paint of the new route.
    setTimeout(() => setOrigin(null), 600);
  };

  /**
   * Opening a project is a full-screen event: the card grows from where it
   * sits to fill the viewport while he walks into the portal. Reduced-motion
   * and keyboard users navigate straight there.
   */
  const handleOpen = (e: React.MouseEvent) => {
    if (!project.href || prefersReducedMotion || origin) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    setOrigin({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    play("portal_enter", { flip, force: true });
    clearTimeout(navTimer.current);
    navTimer.current = setTimeout(navigate, PORTAL_MS);
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full border border-ink-line px-3 py-1 text-[11px] font-medium tracking-wide text-accent-soft">
          {project.category}
        </span>
        {project.href && (
          <span className="text-haze transition group-hover:translate-x-1 group-hover:text-accent">
            →
          </span>
        )}
      </div>

      <h3 className="mt-6 font-display text-2xl text-paper">{project.title}</h3>
      <p className="mt-1 text-sm text-accent-soft">{project.tagline}</p>
      <p className="mt-4 text-sm leading-relaxed text-haze">{project.description}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {project.stack.map((s) => (
          <span key={s} className="rounded-md bg-ink px-2.5 py-1 text-[11px] text-haze">
            {s}
          </span>
        ))}
      </div>

      {project.href && (
        <div className="mt-6 text-sm font-medium text-accent">
          {project.hrefLabel ?? "View project"}
        </div>
      )}
    </>
  );

  const wrapperClass =
    "group relative flex h-full flex-col rounded-2xl border border-ink-line bg-ink-soft/60 p-7 transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_20px_60px_-25px_rgba(139,124,255,0.5)]";

  return (
    <>
      <motion.div
        ref={cardRef}
        data-glitchable
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
        animate={origin ? { opacity: 0, transition: { duration: 0.25 } } : { opacity: 1 }}
        onMouseEnter={() => play("pointing", { flip })}
        // Touch equivalent of hover — reacts to a press without stealing the tap.
        onTouchStart={() => play("pointing", { flip })}
      >
        {project.href ? (
          <a
            href={project.href}
            target={project.internal ? undefined : "_blank"}
            rel={project.internal ? undefined : "noreferrer"}
            className={wrapperClass}
            data-rb-scatter
            data-rb-tag="<ProjectCard />"
            data-rb-order="20"
            data-cursor-hover
            onClick={handleOpen}
          >
            {content}
          </a>
        ) : (
          <div
            className={wrapperClass}
            data-rb-scatter
            data-rb-tag="<ProjectCard />"
            data-rb-order="20"
          >
            {content}
          </div>
        )}
      </motion.div>

      <PortalTakeover origin={origin} label={project.title} />
    </>
  );
}
