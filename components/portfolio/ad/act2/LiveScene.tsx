"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChromaClip from "../../avatar/ChromaClip";
import { posterFallback } from "../../avatar/clips";
import type { Capability } from "../../avatar/useCapability";
import type { LiveScene as SceneKey } from "@/data/act2";

/**
 * The half of Act 2 that is drawn rather than played.
 *
 * These scenes bend the interface itself, which a pre-rendered video cannot
 * do: the crack has to split *this* viewport, the glass he knocks on has to be
 * the visitor's own screen, the fold has to demonstrate real responsive
 * breakpoints, and the final pull-back has to land on the actual portfolio.
 *
 * The character is composited in from the same chroma-key clips the rest of
 * the site uses, so he is identical here to everywhere else.
 */
export default function LiveScene({
  scene,
  active,
  portrait,
  cap,
  frozen,
}: {
  scene: SceneKey;
  active: boolean;
  portrait: boolean;
  cap: Capability;
  frozen: boolean;
}) {
  // Nothing inside a scene starts moving until the frame is actually handed
  // to it — the engine mounts each one early so it is warm, not so it plays.
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (active) setStarted(true);
  }, [active]);

  const common = { started, portrait, cap, frozen };

  switch (scene) {
    case "bridge_tear":
      return <BridgeTear {...common} />;
    case "bridge_fall":
      return <BridgeFall {...common} />;
    case "crack":
      return <Crack {...common} />;
    case "realities":
      return <Realities {...common} />;
    case "zerog":
      return <ZeroG {...common} />;
    case "glass":
      return <Glass {...common} />;
    case "clones":
      return <Clones {...common} />;
    case "freeze":
      return <Freeze {...common} />;
    case "lens":
      return <Lens {...common} />;
    case "fold":
      return <Fold {...common} />;
    case "cube":
      return <Cube {...common} />;
    case "pixel":
      return <Pixel {...common} />;
    case "signoff":
      return <SignOff {...common} />;
  }
}

type P = { started: boolean; portrait: boolean; cap: Capability; frozen: boolean };

const SPACE =
  "absolute inset-0 overflow-hidden bg-[#05060D] bg-[radial-gradient(circle_at_30%_25%,rgba(139,124,255,0.22),transparent_60%),radial-gradient(circle_at_72%_75%,rgba(94,230,208,0.18),transparent_62%)]";

/* ══ bridges ═════════════════════════════════════════════
   These carry the camera between two pieces of footage that cannot meet
   directly. They hold no character and no cut — just the move the camera was
   already making, continued. */

/** Through the torn opening, and a city rises into the light. */
function BridgeTear({ started }: P) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05060D]">
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper"
        initial={{ width: "120%", height: "120%", opacity: 1 }}
        animate={started ? { width: 0, height: 0, opacity: 0.9 } : {}}
        transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
        style={{ filter: "blur(3px)" }}
      />
      {/* skyline coming up to meet the camera */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-[6%] rounded-t border border-accent/40 bg-ink/80"
            initial={{ height: 0, opacity: 0 }}
            animate={started ? { height: `${18 + ((i * 37) % 62)}vh`, opacity: 1 } : {}}
            transition={{ duration: 1.5, delay: 0.35 + (i % 5) * 0.06, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      {/* roads, arriving as light */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/3"
        initial={{ opacity: 0 }}
        animate={started ? { opacity: 0.75 } : {}}
        transition={{ delay: 0.6, duration: 0.9 }}
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(94,230,208,0.35) 0 2px, transparent 2px 60px)",
          maskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
    </div>
  );
}

/** The fall in which the architecture resolves into syntax. */
function BridgeFall({ started }: P) {
  const bits = ["<div>", "{ }", "</section>", "( )", "=>", "[ ]", "<main>", "::after"];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05060D]" style={{ perspective: 700 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 font-mono text-accent-soft"
          style={{ fontSize: `${0.8 + (i % 4) * 0.5}rem` }}
          initial={{
            x: `${((i * 53) % 90) - 45}vw`,
            y: "60vh",
            opacity: 0,
            filter: "blur(6px)",
          }}
          animate={
            started
              ? { y: "-70vh", opacity: [0, 1, 1, 0], filter: "blur(0px)" }
              : {}
          }
          transition={{ duration: 1.5, delay: (i % 6) * 0.12, ease: "linear", times: [0, 0.15, 0.7, 1] }}
        >
          {bits[i % bits.length]}
        </motion.div>
      ))}
      {/* a tower, giving up on being a tower */}
      <motion.div
        className="absolute left-1/2 top-0 h-full w-[26%] -translate-x-1/2 border-x border-accent/40"
        initial={{ opacity: 0.7, scaleY: 1, filter: "blur(0px)" }}
        animate={started ? { opacity: 0, scaleY: 1.6, filter: "blur(16px)" } : {}}
        transition={{ duration: 1.6, ease: "easeIn" }}
      />
      {/* and the platform he is about to land on */}
      <motion.div
        className="absolute bottom-[22%] left-1/2 h-3 -translate-x-1/2 rounded-full bg-accent/70"
        initial={{ width: 0, opacity: 0 }}
        animate={started ? { width: "46%", opacity: 1 } : {}}
        transition={{ delay: 1.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/* ══ the shockwave hits the lens and the viewport splits ══ */
function Crack({ started, cap, portrait }: P) {
  return (
    <div className={SPACE}>
      {/* the shockwave arriving from the last shot, still travelling */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-accent-soft"
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={started ? { scale: 14, opacity: 0 } : {}}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />

      {/* it does not cut — the frame itself fractures */}
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        initial={{ opacity: 0 }}
        animate={started ? { opacity: 1 } : {}}
        transition={{ delay: 0.55, duration: 0.12 }}
      >
        <motion.path
          d="M50 0 L47 14 L53 27 L46 41 L52 55 L45 68 L51 82 L48 100"
          stroke="#F4F1EA"
          strokeWidth="0.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={started ? { pathLength: 1 } : {}}
          transition={{ delay: 0.55, duration: 0.35, ease: "easeOut" }}
        />
      </motion.svg>

      {/* he takes hold of the split and hauls it open */}
      <motion.div
        className="absolute inset-0 flex items-end justify-center pb-[6%]"
        initial={{ opacity: 0 }}
        animate={started ? { opacity: 1 } : {}}
        transition={{ delay: 0.8, duration: 0.2 }}
      >
        <div className="h-[62%] w-auto">
          <ChromaClip paused={!started} maxKeyWidth={portrait ? 190 : 340} clip="reach_pull" cap={cap} className="h-full w-auto" />
        </div>
      </motion.div>

      {/* light from whatever is behind this reality */}
      <motion.div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-paper"
        initial={{ width: 0 }}
        animate={started ? { width: "108%" } : {}}
        transition={{ delay: 1.6, duration: 1.9, ease: [0.6, 0, 0.2, 1] }}
        style={{ filter: "blur(2px)" }}
      />
    </div>
  );
}

/* ══ raw on the left, finished on the right ══════════════ */
const THROWS = [
  { id: "phone", raw: "wireframe", done: "app", delay: 0.6 },
  { id: "html", raw: "raw HTML", done: "website", delay: 1.5 },
  { id: "qr", raw: "plain QR", done: "branded QR", delay: 2.4 },
  { id: "db", raw: "schema", done: "dashboard", delay: 3.3 },
];

function Realities({ started, portrait, cap }: P) {
  return (
    <div className={SPACE}>
      {/* left: unfinished */}
      <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden border-r border-paper/25 bg-[#07090F]">
        <div className="absolute inset-0 p-6 opacity-70">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="mb-3 rounded border border-dashed border-paper/30"
              style={{ height: 22 + (i % 3) * 16, width: `${60 + (i % 4) * 10}%` }}
            />
          ))}
        </div>
        <p className="absolute bottom-5 left-5 font-mono text-[10px] tracking-widest text-paper/45">
          RAW
        </p>
      </div>

      {/* right: shipped */}
      <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden bg-[#0B0E1A]">
        <div className="absolute inset-0 p-6">
          <div className="mb-3 h-8 rounded-lg bg-accent/40" />
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-accent-soft/20 shadow-soft" />
            ))}
          </div>
          <div className="h-7 w-2/3 rounded-full bg-accent/60" />
        </div>
        <p className="absolute bottom-5 right-5 font-mono text-[10px] tracking-widest text-accent-soft">
          SHIPPED
        </p>
      </div>

      {/* the throw: it changes as it crosses the boundary, not after */}
      {THROWS.map((t) => (
        <motion.div
          key={t.id}
          className="absolute top-1/2 -translate-y-1/2"
          initial={{ left: "18%", opacity: 0, rotate: -12, scale: 0.85 }}
          animate={started ? { left: "76%", opacity: [0, 1, 1, 0], rotate: 8, scale: 1 } : {}}
          transition={{ delay: t.delay, duration: 1.5, ease: [0.3, 0, 0.2, 1], times: [0, 0.12, 0.86, 1] }}
        >
          <CrossFader raw={t.raw} done={t.done} started={started} delay={t.delay} />
        </motion.div>
      ))}

      {/* he throws them across, then crushes the two halves together */}
      <div className="absolute bottom-[4%] left-[6%] h-[52%]">
        <ChromaClip paused={!started} maxKeyWidth={portrait ? 190 : 340} clip="throw" cap={cap} className="h-full w-auto" />
      </div>

      <motion.div
        className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-paper/80"
        initial={{ scaleY: 1, opacity: 0.8 }}
        animate={started ? { opacity: [0.8, 1, 0] } : {}}
        transition={{ delay: 5, duration: 0.9 }}
      />
      <motion.div
        className="absolute inset-0"
        initial={{ scaleX: 1 }}
        animate={started ? { scaleX: [1, 1, 0.02] } : {}}
        transition={{ delay: 5, duration: 0.9, times: [0, 0.5, 1], ease: [0.7, 0, 0.3, 1] }}
        style={{ transformOrigin: "50% 50%", pointerEvents: "none" }}
      />
      {portrait ? null : null}
    </div>
  );
}

/** Wireframe on the way in, finished product on the way out. */
function CrossFader({
  raw,
  done,
  started,
  delay,
}: {
  raw: string;
  done: string;
  started: boolean;
  delay: number;
}) {
  return (
    <div className="relative h-24 w-32">
      <motion.div
        className="absolute inset-0 grid place-items-center rounded-xl border border-dashed border-paper/50 font-mono text-[10px] text-paper/70"
        initial={{ opacity: 1 }}
        animate={started ? { opacity: 0 } : {}}
        transition={{ delay: delay + 0.72, duration: 0.06 }}
      >
        {raw}
      </motion.div>
      <motion.div
        className="absolute inset-0 grid place-items-center rounded-xl border border-accent bg-accent/15 font-mono text-[10px] text-accent-soft shadow-[0_0_40px_-8px_rgba(94,230,208,0.9)]"
        initial={{ opacity: 0 }}
        animate={started ? { opacity: 1 } : {}}
        transition={{ delay: delay + 0.72, duration: 0.06 }}
      >
        {done}
      </motion.div>
    </div>
  );
}

/* ══ physics gives up ════════════════════════════════════ */
const FLOATERS = [
  "browser", "phone", "QR", "database", "API", "card", "agent", "{ }", "</>", "grid",
];

function ZeroG({ started, portrait, cap }: P) {
  return (
    <div className={SPACE} style={{ perspective: 1100 }}>
      <motion.div
        className="absolute inset-0"
        initial={{ rotateY: 0 }}
        animate={started ? { rotateY: portrait ? 18 : 34 } : {}}
        transition={{ duration: 5, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {FLOATERS.map((f, i) => (
          <motion.div
            key={f}
            className="absolute rounded-xl border border-accent/45 bg-ink/70 px-3 py-2 font-mono text-[11px] text-accent-soft"
            style={{ left: `${8 + (i % 5) * 19}%`, top: `${16 + Math.floor(i / 5) * 34}%` }}
            initial={{ y: 0, rotate: 0, opacity: 0.9 }}
            animate={
              started
                ? { y: [-4, -70 - (i % 4) * 26], rotate: (i % 2 ? -1 : 1) * (10 + i * 3), opacity: 1 }
                : {}
            }
            transition={{ duration: 4.5, ease: [0.2, 0.7, 0.3, 1] }}
          >
            {f}
          </motion.div>
        ))}
      </motion.div>

      {/* he kicks off a button like it is a bulkhead */}
      <motion.div
        className="absolute bottom-[8%] left-1/2 h-[54%] -translate-x-1/2"
        initial={{ y: 0 }}
        animate={started ? { y: -90, rotate: -8 } : {}}
        transition={{ duration: 4.2, ease: [0.2, 0.8, 0.3, 1] }}
      >
        <ChromaClip paused={!started} maxKeyWidth={portrait ? 190 : 340} clip="jump" cap={cap} className="h-full w-auto" />
      </motion.div>

      {/* the phone he throws behind himself — the next shot rides it in */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[22px] border-2 border-accent bg-ink"
        initial={{ width: 60, height: 120, rotate: 0, opacity: 0 }}
        animate={started ? { width: 900, height: 1700, rotate: 380, opacity: 1 } : {}}
        transition={{ delay: 3.4, duration: 1.8, ease: [0.5, 0, 0.3, 1] }}
      />
    </div>
  );
}

/* ══ he notices where he is ══════════════════════════════ */
function Glass({ started, portrait, cap }: P) {
  const [knock, setKnock] = useState(0);
  const [push, setPush] = useState(false);
  useEffect(() => {
    if (!started) return;
    const times = [500, 1000, 1500].map((d) =>
      setTimeout(() => setKnock((k) => k + 1), d)
    );
    // The sustained shove comes straight off the third knock.
    const shove = setTimeout(() => setPush(true), 1800);
    return () => {
      times.forEach(clearTimeout);
      clearTimeout(shove);
    };
  }, [started]);

  return (
    <motion.div
      className={SPACE}
      // The whole layer flexes when he pushes on it, so it reads as the
      // visitor's own display bending rather than a video of a screen.
      //
      // Driven off the knock count rather than a long keyframe track: a
      // scripted track made the glass answer more than a second after the
      // knuckle landed, which reads as a bug, not a gag. Each knock now
      // deforms the layer on the same frame it happens.
      animate={
        push
          ? { scale: 1.09, rotateX: -9, rotateZ: 0 }
          : knock === 0
          ? { scale: 1, rotateX: 0, rotateZ: 0 }
          : // Each contact throws the whole layer, hard and visibly: a real
            // percussive hit rather than a 1% nudge you cannot see. The
            // magnitude is what makes it read as instant.
            { scale: 1.055 + knock * 0.012, rotateX: -6 - knock * 2, rotateZ: knock % 2 ? 0.7 : -0.7 }
      }
      transition={
        push
          ? { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
          : { type: "spring", stiffness: 700, damping: 11, mass: 0.5 }
      }
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* the edges of the thing he is inside */}
      <div className="absolute inset-3 rounded-[28px] border-2 border-paper/25 sm:inset-6" />
      {!portrait && (
        <div className="absolute inset-x-6 top-6 flex h-8 items-center gap-2 rounded-t-xl border-b border-paper/20 px-3">
          <span className="h-2 w-2 rounded-full bg-paper/40" />
          <span className="h-2 w-2 rounded-full bg-paper/40" />
          <span className="h-2 w-2 rounded-full bg-paper/40" />
        </div>
      )}

      {/* knocks land on the glass */}
      {Array.from({ length: knock }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-paper/60"
          style={{ left: `${portrait ? 50 : 46}%`, top: `${44 + i * 3}%` }}
          initial={{ width: 10, height: 10, opacity: 1, borderWidth: 3 }}
          animate={{ width: 620, height: 620, opacity: 0, x: -310, y: -310, borderWidth: 1 }}
          transition={{ duration: 0.55, ease: [0.1, 0.9, 0.2, 1] }}
        />
      ))}

      {/* the impact itself, on the frame */}
      {knock > 0 && (
        <motion.div
          key={`flash-${knock}`}
          className="pointer-events-none absolute inset-0 bg-paper"
          initial={{ opacity: 0.28 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      )}

      <div className="absolute bottom-[6%] left-1/2 h-[64%] -translate-x-1/2">
        <ChromaClip paused={!started} maxKeyWidth={portrait ? 190 : 340} clip="reach_pull" cap={cap} className="h-full w-auto" />
      </div>

      <motion.p
        className="absolute inset-x-0 bottom-[4%] text-center font-mono text-[11px] tracking-[0.3em] text-paper/60"
        initial={{ opacity: 0 }}
        animate={started ? { opacity: [0, 1, 1, 0] } : {}}
        transition={{ delay: 0.8, duration: 2.6, times: [0, 0.15, 0.85, 1] }}
      >
        {portrait ? "…he is behind your screen" : "…he is behind your browser"}
      </motion.p>

      {/* and then he opens the layer behind it */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper"
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={started ? { width: 2400, height: 2400, opacity: 1 } : {}}
        transition={{ delay: 3.3, duration: 1.7, ease: [0.6, 0, 0.2, 1] }}
      />
    </motion.div>
  );
}

/* ══ his reflections stop following him ══════════════════ */
const CLONE_JOBS = [
  { label: "codes", clip: "skills_tap" },
  { label: "designs", clip: "build_website" },
  { label: "debugs", clip: "confused_fix" },
  { label: "builds the app", clip: "build_app" },
  { label: "makes the QR", clip: "build_qr" },
  { label: "does absolutely nothing", clip: "sit_lean" },
] as const;

function Clones({ started, portrait, cap }: P) {
  const shown = portrait ? CLONE_JOBS.slice(0, 4) : CLONE_JOBS;
  // Every live clone is a full per-pixel key every frame. Past the device's
  // budget the rest are stills of the same character — they still step out of
  // the glass and still get absorbed, they just stop costing anything.
  const liveKeys = Math.max(1, cap.maxClones);
  return (
    <div className={SPACE}>
      {/* the reflective interface he walks past */}
      <div className="absolute inset-x-0 top-[18%] h-[2px] bg-gradient-to-r from-transparent via-paper/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-[10%] flex items-end justify-center gap-1 sm:gap-4">
        {shown.map((c, i) => (
          <motion.div
            key={c.label}
            className="relative h-[34vh] w-[22%] sm:h-[46vh]"
            initial={{ opacity: 0, y: -40, filter: "blur(6px)" }}
            animate={
              started
                ? {
                    opacity: [0, 1, 1, 0],
                    y: [-40, 0, 0, 0],
                    x: [0, 0, 0, portrait ? 0 : (shown.length / 2 - i) * 40],
                    scale: [1, 1, 1, 0.2],
                    filter: ["blur(6px)", "blur(0px)", "blur(0px)", "blur(10px)"],
                  }
                : {}
            }
            transition={{
              // Fits inside the shot: the last clone is absorbed at 5.5s of
              // the 6s window. At the old 6s + 0.35s stagger the final two
              // were still merging when the film cut away from them.
              duration: 4.4,
              delay: 0.15 + i * 0.2,
              times: [0, 0.14, 0.68, 1],
            }}
          >
            {i < liveKeys ? (
              <ChromaClip
                paused={!started}
                maxKeyWidth={portrait ? 120 : 220}
                clip={c.clip}
                cap={cap}
                className="h-full w-auto"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterFallback} alt="" className="h-full w-auto" />
            )}
            <p className="absolute inset-x-0 bottom-0 text-center font-mono text-[9px] text-accent-soft sm:text-[11px]">
              {c.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ══ he snaps and the universe stops ═════════════════════ */
function Freeze({ started, cap, frozen, portrait }: P) {
  return (
    <div className={SPACE}>
      {/* the chaos, caught mid-air */}
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-md border border-accent/50 bg-ink/70 px-2 py-1 font-mono text-[10px] text-accent-soft"
          style={{ left: `${6 + ((i * 13) % 88)}%`, top: `${10 + ((i * 27) % 76)}%` }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
          animate={
            started
              ? frozen
                ? { opacity: 1 }
                : { opacity: 1, x: [0, (i % 2 ? -1 : 1) * 90], y: [0, -60], rotate: (i % 2 ? -1 : 1) * 25 }
              : {}
          }
          transition={{ duration: frozen ? 0 : 1.6, ease: "linear" }}
        >
          {["QR", "</>", "null", "{ }", "app", "POST"][i % 6]}
        </motion.div>
      ))}

      {/* a coffee droplet, stopped in the air */}
      <motion.span
        className="absolute left-[22%] top-[38%] h-3 w-2 rounded-full bg-[#8a5a2b]"
        initial={{ y: -30, opacity: 0 }}
        animate={started ? (frozen ? { opacity: 1 } : { y: 120, opacity: 1 }) : {}}
        transition={{ duration: frozen ? 0 : 1.4, ease: "linear" }}
      />

      {/* he is the only thing still moving */}
      <div className="absolute bottom-[6%] left-1/2 h-[62%] -translate-x-1/2">
        <ChromaClip paused={!started} maxKeyWidth={portrait ? 190 : 340} clip="brain_arrange" cap={cap} className="h-full w-auto" />
      </div>

      <motion.p
        className="absolute inset-x-0 top-[10%] text-center font-mono text-[11px] tracking-[0.35em] text-paper/50"
        initial={{ opacity: 0 }}
        animate={started && frozen ? { opacity: 1 } : {}}
        transition={{ duration: 0.2 }}
      >
        EVERYTHING STOPS
      </motion.p>
    </div>
  );
}

/* ══ into the lens, and out with one idea ════════════════ */
function Lens({ started, cap, portrait }: P) {
  return (
    <div className={SPACE}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(94,230,208,0.28),transparent_55%)]" />
      {Array.from({ length: 26 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute font-mono text-[11px] text-accent-soft/80"
          style={{ left: `${(i * 37) % 96}%`, top: `${(i * 53) % 92}%` }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={started ? { opacity: [0, 1, 0.4], scale: 1 } : {}}
          transition={{ duration: 2.2, delay: i * 0.05 }}
        >
          {["idea", "app", "site", "agent", "QR", "flow"][i % 6]}
        </motion.span>
      ))}

      {/* a hand comes in from outside the lens and takes one */}
      <motion.div
        className="absolute right-[6%] top-1/2 h-[52%] -translate-y-1/2"
        initial={{ x: 300, opacity: 0 }}
        animate={started ? { x: 0, opacity: 1 } : {}}
        transition={{ delay: 1.4, duration: 0.8, ease: [0.2, 0, 0.1, 1] }}
      >
        <ChromaClip paused={!started} maxKeyWidth={portrait ? 190 : 340} clip="grab_catch" cap={cap} className="h-full w-auto" />
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft shadow-[0_0_80px_rgba(94,230,208,0.9)]"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={started ? { scale: [0.2, 1, 26], opacity: [0, 1, 1] } : {}}
        transition={{ delay: 2.1, duration: 1.7, times: [0, 0.3, 1], ease: [0.6, 0, 0.2, 1] }}
      />
    </div>
  );
}

/* ══ the portfolio, folded down through every breakpoint ══ */
const FOLDS = [
  { label: "desktop", w: "78%", h: "62%", r: 10 },
  { label: "laptop", w: "62%", h: "54%", r: 10 },
  { label: "tablet", w: "38%", h: "62%", r: 16 },
  { label: "phone", w: "20%", h: "58%", r: 22 },
  { label: "card", w: "26%", h: "17%", r: 12 },
];

function Fold({ started }: P) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!started) return;
    const t = FOLDS.map((_, i) => setTimeout(() => setStep(i), 700 + i * 800));
    const cube = setTimeout(() => setStep(FOLDS.length), 700 + FOLDS.length * 800);
    return () => {
      t.forEach(clearTimeout);
      clearTimeout(cube);
    };
  }, [started]);

  const f = FOLDS[Math.min(step, FOLDS.length - 1)];
  const isCube = step >= FOLDS.length;

  return (
    <div className={SPACE} style={{ perspective: 1400 }}>
      <motion.div
        className="absolute left-1/2 top-1/2 overflow-hidden border-2 border-accent/70 bg-[#0B0E1A]"
        animate={{
          width: isCube ? 150 : f.w,
          height: isCube ? 150 : f.h,
          borderRadius: isCube ? 18 : f.r,
          x: "-50%",
          y: "-50%",
          rotateY: isCube ? 35 : step * 6 - 12,
          boxShadow: isCube
            ? "0 0 120px rgba(139,124,255,0.9)"
            : "0 0 60px rgba(139,124,255,0.35)",
        }}
        transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "absolute", left: "50%", top: "50%" }}
      >
        {/* a real page, not a screenshot */}
        {!isCube && (
          <div className="h-full w-full p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-2 w-16 rounded-full bg-paper/60" />
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-1.5 w-6 rounded-full bg-haze/50" />
                ))}
              </div>
            </div>
            <div className="mb-2 h-1/3 rounded bg-accent/25" />
            <div className={`grid gap-1.5 ${step >= 3 ? "grid-cols-1" : "grid-cols-3"}`}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 rounded bg-accent-soft/25" />
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.p
        key={f.label + String(isCube)}
        className="absolute inset-x-0 bottom-[12%] text-center font-mono text-xs tracking-[0.35em] text-accent-soft"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {isCube ? "ONE CODEBASE" : f.label.toUpperCase()}
      </motion.p>
    </div>
  );
}

/* ══ six sides, and the camera goes through it ═══════════ */
const FACES = ["WEBSITE", "APP", "SOFTWARE", "AI", "QR", "AUTOMATION"];

function Cube({ started }: P) {
  const S = 120;
  const t = [
    `rotateY(0deg) translateZ(${S}px)`,
    `rotateY(90deg) translateZ(${S}px)`,
    `rotateY(180deg) translateZ(${S}px)`,
    `rotateY(-90deg) translateZ(${S}px)`,
    `rotateX(90deg) translateZ(${S}px)`,
    `rotateX(-90deg) translateZ(${S}px)`,
  ];
  return (
    <div className={SPACE} style={{ perspective: 900 }}>
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{
          width: S * 2,
          height: S * 2,
          marginLeft: -S,
          marginTop: -S,
          transformStyle: "preserve-3d",
        }}
        initial={{ rotateX: -18, rotateY: 0, scale: 0.5 }}
        animate={started ? { rotateX: 340, rotateY: 420, scale: 5.5 } : {}}
        transition={{ duration: 3.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {FACES.map((f, i) => (
          <div
            key={f}
            className="absolute grid place-items-center border-2 border-accent/70 bg-ink/85 font-display text-lg tracking-tight text-paper"
            style={{ width: S * 2, height: S * 2, transform: t[i] }}
          >
            {f}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ══ all of it fitted inside one pixel ═══════════════════ */
function Pixel({ started, cap, portrait }: P) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      {/* The camera keeps pulling back and the film we just watched turns out
          to have been one lit pixel on a button on a card on this page. */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 260 }}
        animate={started ? { scale: 1 } : {}}
        transition={{ duration: 6.2, ease: [0.5, 0, 0.15, 1] }}
        style={{ width: "100%", height: "100%" }}
      >
        <div className="relative h-full w-full bg-ink p-6">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-display text-sm text-paper">
              Abderrahmane<span className="text-accent">.</span>
            </p>
            <div className="flex gap-3">
              {["Work", "Skills", "About"].map((l) => (
                <span key={l} className="font-mono text-[7px] text-haze">
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="relative h-16 rounded-lg border border-ink-line bg-ink-soft/60 p-2"
              >
                <div className="h-2 w-2/3 rounded-full bg-haze/40" />
                {i === 1 && (
                  <div className="mt-3 inline-flex rounded-full bg-accent px-2 py-1">
                    {/* the pixel */}
                    <motion.span
                      className="block h-[2px] w-[2px] bg-paper"
                      animate={started ? { opacity: [1, 0.4, 1] } : {}}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* and he is standing in it, exactly where he started */}
      <motion.div
        className="absolute bottom-[4%] right-[8%] h-[46%]"
        initial={{ opacity: 0 }}
        animate={started ? { opacity: 1 } : {}}
        transition={{ delay: 5.4, duration: 0.5 }}
      >
        <ChromaClip paused={!started} maxKeyWidth={portrait ? 190 : 340} clip="sign_off" cap={cap} className="h-full w-auto" />
      </motion.div>
    </div>
  );
}

/* ══ he covers the lens ══════════════════════════════════ */
function SignOff({ started, cap, portrait }: P) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <motion.div
        className="absolute inset-0 flex items-end justify-center"
        initial={{ scale: 1, opacity: 1 }}
        animate={started ? { scale: 2.6, opacity: 1 } : {}}
        transition={{ delay: 3.6, duration: 2.2, ease: [0.5, 0, 0.3, 1] }}
      >
        <div className="h-[78%]">
          <ChromaClip paused={!started} maxKeyWidth={portrait ? 190 : 340} clip="brain_pull" cap={cap} className="h-full w-auto" />
        </div>
      </motion.div>

      {/* black, silence, and one glint left in the lens */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={started ? { opacity: 1 } : {}}
        transition={{ delay: 5.6, duration: 0.35 }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[3px] w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={started ? { opacity: [0, 0.9, 0.25], scaleX: [0, 1, 1] } : {}}
        transition={{ delay: 5.8, duration: 1.1 }}
        style={{ filter: "blur(1px)" }}
      />
    </div>
  );
}
