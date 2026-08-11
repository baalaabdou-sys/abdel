"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { REGIONS, THOUGHTS, type Region, type Thought } from "@/data/brainThoughts";

/**
 * The space inside his head.
 *
 * Built from stacked 3D-transformed layers rather than a WebGL scene: depth
 * comes from perspective + translateZ, which the compositor handles, so a
 * mid-range Android holds frame rate while a dozen things drift at once.
 */
export default function World({
  region,
  setRegion,
  onOpen,
  particles,
  portrait,
}: {
  region: Region;
  setRegion: (r: Region) => void;
  onOpen: (t: Thought) => void;
  /** Star count, lowered on weaker devices. */
  particles: number;
  portrait: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);

  // Parallax. Pointer on desktop; a slow, hands-off drift in portrait so the
  // world still breathes when nobody is moving a cursor.
  const px = useSpring(useMotionValue(0), { stiffness: 40, damping: 20 });
  const py = useSpring(useMotionValue(0), { stiffness: 40, damping: 20 });

  useEffect(() => {
    if (portrait) {
      let raf = 0;
      const t0 = performance.now();
      const tick = (t: number) => {
        raf = requestAnimationFrame(tick);
        const s = (t - t0) / 1000;
        px.set(Math.sin(s * 0.22) * 14);
        py.set(Math.cos(s * 0.17) * 9);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * -46);
      py.set((e.clientY / window.innerHeight - 0.5) * -30);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [portrait, px, py]);

  const stars = useMemo(
    () =>
      Array.from({ length: particles }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: -200 - Math.random() * 900,
        s: 1 + Math.random() * 2,
        d: 2 + Math.random() * 4,
      })),
    [particles]
  );

  const visible = THOUGHTS.filter((t) => t.region === region);
  const secret = THOUGHTS.find((t) => t.region === "secret")!;

  return (
    <div
      ref={wrap}
      className="absolute inset-0 overflow-hidden"
      style={{ perspective: portrait ? "900px" : "1200px" }}
    >
      {/* ── deep background ─────────────────────────────── */}
      <div className="absolute inset-0 bg-[#05060D]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,124,255,0.20),transparent_58%),radial-gradient(circle_at_75%_78%,rgba(94,230,208,0.16),transparent_60%)]" />

      <motion.div className="absolute inset-0" style={{ x: px, y: py }}>
        {/* Everything decorative lives in its own 3D layer. The thoughts do
            not: elements inside a preserve-3d context hit-test against their
            untransformed geometry in some engines, which makes a floating orb
            genuinely hard to tap. Depth for those is scale and opacity. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
        {/* drifting particles */}
        {stars.map((s, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-accent-soft/70"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, z: s.z }}
            animate={{ opacity: [0.15, 0.85, 0.15] }}
            transition={{ duration: s.d, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* the big rotating braces, a long way off */}
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[22vw] leading-none text-accent/10"
          style={{ z: -760 }}
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
        >
          {"{ }"}
        </motion.div>

        {/* ── frontend → api → backend → database ────────
            The pipeline everything I build ends up shaped like, drawn as
            light moving between nodes instead of a diagram with arrows. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[12%]"
          style={{ transform: "translateZ(-420px)" }}
        >
          <svg viewBox="0 0 1000 120" className="h-24 w-full opacity-70">
            <defs>
              <linearGradient id="brain-wire" x1="0" x2="1">
                <stop offset="0%" stopColor="#8B7CFF" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#5EE6D0" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#8B7CFF" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M80 60 H320 M400 60 H620 M700 60 H920"
              stroke="url(#brain-wire)"
              strokeWidth="1.5"
              fill="none"
            />
            {[80, 360, 660, 920].map((cx, i) => (
              <g key={cx}>
                <circle cx={cx} cy="60" r="9" fill="#0B0E1A" stroke="#5EE6D0" strokeWidth="1.2" />
                <text
                  x={cx}
                  y="92"
                  textAnchor="middle"
                  className="fill-[#5EE6D0]"
                  style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", opacity: 0.75 }}
                >
                  {["frontend", "api", "backend", "db"][i]}
                </text>
              </g>
            ))}
            {/* packets of light travelling the wire */}
            {[0, 1, 2].map((i) => (
              <circle key={i} r="3.5" fill="#5EE6D0">
                <animateMotion
                  dur={`${3.4 + i * 0.8}s`}
                  repeatCount="indefinite"
                  path="M80 60 H920"
                  begin={`${i * 1.1}s`}
                />
              </circle>
            ))}
          </svg>
        </div>

        {/* ── the platform he stands on: a giant <div> ──── */}
        <div
          className="pointer-events-none absolute left-1/2 top-[62%] -translate-x-1/2 rounded-[40px] border border-accent/25 bg-accent/[0.04]"
          style={{
            width: portrait ? "78vw" : "42vw",
            height: portrait ? "22vh" : "26vh",
            transform: "translateX(-50%) translateZ(-60px) rotateX(64deg)",
          }}
        />
        <span
          className="pointer-events-none absolute left-1/2 top-[59%] -translate-x-1/2 font-mono text-xs text-accent/45"
          style={{ transform: "translateX(-50%) translateZ(-60px)" }}
        >
          &lt;div className=&quot;mind&quot;&gt;
        </span>

        </div>

        {/* ── the thoughts in this region ───────────────── */}
        {visible.map((t, i) => (
          <Orb key={t.id} thought={t} index={i} portrait={portrait} onOpen={onOpen} />
        ))}

        {/* ── the one that is not labelled ──────────────── */}
        {region === "code" && (
          <Orb thought={secret} index={99} portrait={portrait} onOpen={onOpen} secret />
        )}
      </motion.div>

      {/* ── terminal, used as the lift between areas ────── */}
      <div
        className={`absolute z-10 rounded-xl border border-accent-soft/40 bg-[#070A14]/90 p-3 font-mono text-[11px] shadow-[0_0_50px_-12px_rgba(94,230,208,0.6)] backdrop-blur-sm sm:text-xs ${
          portrait ? "inset-x-4 bottom-24" : "bottom-10 left-10 w-64"
        }`}
      >
        <div className="mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400/70" />
          <span className="h-2 w-2 rounded-full bg-yellow-400/70" />
          <span className="h-2 w-2 rounded-full bg-green-400/70" />
          <span className="ml-2 text-haze/60">mind — zsh</span>
        </div>
        <div className={portrait ? "grid grid-cols-2 gap-1.5" : "space-y-1"}>
          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              data-cursor-hover
              onClick={() => setRegion(r.id)}
              className={`block w-full truncate rounded px-2 py-1.5 text-left transition ${
                region === r.id
                  ? "bg-accent-soft/15 text-accent-soft"
                  : "text-haze hover:bg-paper/5 hover:text-paper"
              }`}
            >
              <span className="text-accent">$</span> {r.cmd}
            </button>
          ))}
        </div>
      </div>

      {/* which area you are standing in */}
      <div
        className={`pointer-events-none absolute z-10 ${
          portrait ? "left-4 top-20" : "left-10 top-28"
        }`}
      >
        <p className="font-display text-2xl text-paper sm:text-3xl">
          {REGIONS.find((r) => r.id === region)?.label}
        </p>
        <p className="mt-1 font-mono text-xs text-haze/70">
          {REGIONS.find((r) => r.id === region)?.hint}
        </p>
      </div>
    </div>
  );
}

/**
 * A single thought, floating. Reacts before you commit to it — hover on a
 * pointer, a permanent slow pulse on touch where there is no hover to give.
 */
function Orb({
  thought,
  index,
  portrait,
  onOpen,
  secret = false,
}: {
  thought: Thought;
  index: number;
  portrait: boolean;
  onOpen: (t: Thought) => void;
  secret?: boolean;
}) {
  const [near, setNear] = useState(false);
  const { pos } = thought;
  // -80 (close) … -400 (far) → 1 … 0.72
  const depth = 1 - Math.min(0.28, (Math.abs(pos.z) - 80) / 1150);

  return (
    <motion.button
      type="button"
      data-cursor-hover
      aria-label={secret ? "Unlabelled thought" : `${thought.title} — ${thought.status}`}
      onPointerEnter={() => setNear(true)}
      onPointerLeave={() => setNear(false)}
      onClick={() => onOpen(thought)}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl"
      style={{
        left: `${portrait ? 12 + (pos.x % 76) : pos.x}%`,
        top: `${portrait ? 22 + (index % 4) * 13 : pos.y}%`,
        // Depth without translateZ: the further back a thought sits, the
        // smaller and fainter it is. Keeps it tappable at any distance.
        opacity: depth * 0.35 + 0.65,
      }}
      animate={{
        y: [0, -12, 0],
        scale: (near ? 1.09 : 1) * depth,
      }}
      transition={{
        y: { duration: 4.5 + (index % 5) * 0.6, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: 0.25 },
      }}
    >
      <span
        className={`relative flex flex-col items-start gap-1 rounded-2xl border px-3.5 py-3 text-left backdrop-blur-[2px] transition ${
          secret
            ? "border-paper/30 bg-paper/[0.04]"
            : near
            ? "border-accent-soft bg-accent-soft/10 shadow-[0_0_45px_-8px_rgba(94,230,208,0.9)]"
            : "border-accent/40 bg-ink/70 shadow-[0_0_30px_-14px_rgba(139,124,255,0.9)]"
        }`}
      >
        {secret ? (
          <span className="font-mono text-lg text-paper/70">???</span>
        ) : (
          <>
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
              {thought.status}
            </span>
            <span className="max-w-[42vw] truncate text-sm font-medium text-paper sm:max-w-none">
              {thought.title}
            </span>
          </>
        )}
        {/* the glow that says it is alive */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(94,230,208,0.22),transparent_70%)]"
          animate={{ opacity: [0.2, 0.65, 0.2] }}
          transition={{ duration: 3 + (index % 3), repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
    </motion.button>
  );
}
