"use client";

import { motion } from "framer-motion";
import type { Thought } from "@/data/brainThoughts";

/**
 * A thought pulled out of the mind and held up close.
 *
 * Each area gets the object it should be: apps arrive as a phone, sites as a
 * browser window, AI as a node graph, code as a block of code. Text stays
 * short on purpose — this is meant to be looked at, not read.
 */
export default function ThoughtDetail({
  thought,
  portrait,
  onClose,
}: {
  thought: Thought;
  portrait: boolean;
  onClose: () => void;
}) {
  const secret = thought.region === "secret";

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* it comes at the camera, so the space behind it drops away */}
      <motion.div
        className="absolute inset-0 bg-ink/70 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.28, z: -400, rotateY: -22 }}
        animate={{ opacity: 1, scale: 1, z: 0, rotateY: 0 }}
        exit={{ opacity: 0, scale: 0.24, z: -500, rotateY: 18, transition: { duration: 0.4 } }}
        transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full ${portrait ? "max-w-[92vw]" : "max-w-3xl"}`}
      >
        {secret ? (
          <div className="rounded-3xl border border-paper/25 bg-[#070A14]/95 p-8 text-center shadow-[0_0_90px_-20px_rgba(255,255,255,0.35)]">
            <p className="font-mono text-4xl text-paper/80">???</p>
            <p className="mt-4 text-sm text-haze">Not yet.</p>
          </div>
        ) : (
          <div
            className={`grid gap-6 rounded-3xl border border-accent/40 bg-[#070A14]/95 p-6 shadow-[0_0_110px_-25px_rgba(139,124,255,0.9)] sm:p-8 ${
              portrait ? "" : "grid-cols-[0.9fr_1.1fr] items-center"
            }`}
          >
            <Visual thought={thought} />

            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                {thought.status}
              </p>
              <h3 className="mt-2 font-display text-2xl text-paper sm:text-3xl">
                {thought.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-haze">{thought.line}</p>

              <ul className="mt-5 space-y-1.5">
                {thought.notes.map((n) => (
                  <li key={n} className="flex items-start gap-2 font-mono text-xs text-accent-soft">
                    <span className="text-accent">—</span>
                    {n}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-2">
                {thought.stack.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-ink-line px-2.5 py-1 font-mono text-[10px] text-haze"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          data-cursor-hover
          onClick={onClose}
          className="absolute -top-4 right-0 rounded-full border border-ink-line bg-ink px-4 py-1.5 text-xs text-haze transition hover:border-accent/60 hover:text-paper"
        >
          put it back
        </button>
      </motion.div>
    </motion.div>
  );
}

/** The object the idea would actually be, if it existed yet. */
function Visual({ thought }: { thought: Thought }) {
  if (thought.region === "apps") {
    return (
      <div className="mx-auto w-40 rounded-[26px] border-2 border-accent/50 bg-ink p-2 shadow-[0_0_50px_-14px_rgba(94,230,208,0.9)]">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ink-line" />
        <div className="space-y-2 rounded-[18px] bg-ink-soft/70 p-3">
          <div className="h-8 rounded-lg bg-accent/25" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-accent-soft/25" />
              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-3/4 rounded-full bg-haze/30" />
                <div className="h-1.5 w-1/2 rounded-full bg-haze/20" />
              </div>
            </div>
          ))}
          <div className="h-7 rounded-full bg-accent/40" />
        </div>
      </div>
    );
  }

  if (thought.region === "sites") {
    return (
      <motion.div
        animate={{ rotateY: [-9, 9, -9] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-xl border border-accent/50 bg-ink p-2 shadow-[0_0_50px_-14px_rgba(139,124,255,0.9)]"
      >
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <span className="h-1.5 w-1.5 rounded-full bg-haze/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-haze/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-haze/40" />
          <span className="ml-2 h-2 flex-1 rounded-full bg-ink-line" />
        </div>
        <div className="space-y-2 rounded-lg bg-ink-soft/70 p-3">
          <div className="h-10 rounded bg-accent/20" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded border border-dashed border-accent/40" />
            ))}
          </div>
          <div className="h-1.5 w-2/3 rounded-full bg-haze/25" />
        </div>
      </motion.div>
    );
  }

  if (thought.region === "ai") {
    return (
      <svg viewBox="0 0 200 150" className="mx-auto w-full max-w-[220px]">
        {[
          [30, 40],
          [30, 110],
          [100, 75],
          [170, 45],
          [170, 105],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="7" fill="#0B0E1A" stroke="#5EE6D0" strokeWidth="1.3" />
        ))}
        {[
          "M30 40 L100 75",
          "M30 110 L100 75",
          "M100 75 L170 45",
          "M100 75 L170 105",
        ].map((d, i) => (
          <path key={i} d={d} stroke="#8B7CFF" strokeWidth="1" fill="none" opacity="0.7">
            <animate
              attributeName="stroke-dasharray"
              values="0 120; 120 0"
              dur="2.6s"
              begin={`${i * 0.4}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}
      </svg>
    );
  }

  return (
    <pre className="overflow-hidden rounded-xl border border-accent/40 bg-ink p-4 font-mono text-[10px] leading-relaxed text-accent-soft sm:text-xs">
{`function ship(idea) {
  const spec = clarify(idea);
  const api  = design(spec);
  return build(api);
}`}
    </pre>
  );
}
