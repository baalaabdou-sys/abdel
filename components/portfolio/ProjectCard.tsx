"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Project } from "@/data/projects";
import { useAvatarContext } from "./avatar/AvatarContext";

export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const { requestAction } = useAvatarContext();
  const flip = index % 3 === 2;
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
          <span
            key={s}
            className="rounded-md bg-ink px-2.5 py-1 text-[11px] text-haze"
          >
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
    "group flex h-full flex-col rounded-2xl border border-ink-line bg-ink-soft/60 p-7 transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_20px_60px_-25px_rgba(139,124,255,0.5)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      onMouseEnter={() => requestAction("point_action", { flip, holdMs: 3000 })}
    >
      {project.href ? (
        project.internal ? (
          <Link href={project.href} className={wrapperClass} data-cursor-hover>
            {content}
          </Link>
        ) : (
          <a
            href={project.href}
            target="_blank"
            rel="noreferrer"
            className={wrapperClass}
            data-cursor-hover
          >
            {content}
          </a>
        )
      ) : (
        <div className={wrapperClass}>{content}</div>
      )}
    </motion.div>
  );
}
