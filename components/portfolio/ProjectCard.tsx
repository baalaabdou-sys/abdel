"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Project } from "@/data/projects";
import { useAvatarContext } from "./avatar/AvatarContext";
import Portal from "./avatar/Portal";

/** How long the portal sequence runs before the project actually opens. */
const PORTAL_MS = 1250;

export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const { play } = useAvatarContext();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const navTimer = useRef<ReturnType<typeof setTimeout>>();
  const flip = index % 3 === 2;

  const navigate = () => {
    if (!project.href) return;
    if (project.internal) router.push(project.href);
    else window.open(project.href, "_blank", "noopener,noreferrer");
  };

  /**
   * Opening a project isn't a page swap — he walks up, opens a portal in the
   * card and steps through it, and the navigation happens under the cover of
   * that. Reduced-motion and keyboard users go straight there instead.
   */
  const handleOpen = (e: React.MouseEvent) => {
    if (!project.href || prefersReducedMotion || opening) return;
    e.preventDefault();
    setOpening(true);
    play("portal_enter", { flip });
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

  const body = (
    <>
      {content}
      {/* The card itself becomes the doorway. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10">
        <Portal open={opening} size={300} />
      </div>
    </>
  );

  return (
    <motion.div
      data-glitchable
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      animate={
        opening
          ? { scale: 1.04, filter: "brightness(1.25)", transition: { duration: 0.5 } }
          : { scale: 1, filter: "brightness(1)" }
      }
      onMouseEnter={() => play("pointing", { flip })}
      // Touch equivalent of hover — he reacts to a press without stealing the tap.
      onTouchStart={() => play("pointing", { flip })}
      className="relative"
    >
      {project.href ? (
        <a
          href={project.href}
          target={project.internal ? undefined : "_blank"}
          rel={project.internal ? undefined : "noreferrer"}
          className={wrapperClass}
          data-cursor-hover
          onClick={handleOpen}
        >
          {body}
        </a>
      ) : (
        <div className={wrapperClass}>{body}</div>
      )}
    </motion.div>
  );
}
