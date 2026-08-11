"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ACT2,
  ACT2_CAPTIONS,
  ACT2_END,
  FREEZE_IN,
  FREEZE_OUT,
  buildAct2Cues,
  ms2,
} from "@/data/act2";
import { useCapability } from "../../avatar/useCapability";
import { useSafeReducedMotion } from "../../avatar/useSafeReducedMotion";
import { ACT2_CLIPS } from "../act2Clips";
import FilmDebug from "../FilmDebug";
import FilmStage, { useStagePortrait } from "../FilmStage";
import StageBackdrop from "../StageBackdrop";
import CutLayer, { PREROLL } from "../MatchCut";
import { Score } from "../score";
import LiveScene from "./LiveScene";

/**
 * Act 2, as one take.
 *
 * The player never shows one shot at a time. Three layers are live at once —
 * the shot leaving through the lens, the shot holding the frame, and the next
 * shot mounted and buffering underneath (PREROLL ms early) so it can start on
 * the frame it is asked to without stalling.
 *
 * It buffers early but does not *play* early. It used to, so that a shot was
 * already in motion when revealed — which meant every take was revealed 0.7s
 * into itself and its opening 0.7s was never seen by anyone. A shot playing
 * from its first frame matters more than a shot being mid-motion at the cut.
 *
 * The score is scheduled on the audio context from the same beat grid, with
 * each transition's sound placed *ahead* of its picture (a J-cut) and a tail
 * behind it (an L-cut), so the ear crosses into the next world first.
 */
export default function Act2Player({
  onEnded,
  muted,
}: {
  onEnded: () => void;
  /** The player's Mute control has to reach this act's score too. */
  muted: boolean;
}) {
  const cap = useCapability();
  const prefersReducedMotion = useSafeReducedMotion();

  const [shot, setShot] = useState(0);
  const shotStarted = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const portrait = useStagePortrait();

  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const score = useRef<Score | null>(null);
  const raf = useRef(0);
  const t0 = useRef(0);

  const total = ms2(ACT2_END);
  // The one moment the film stops dead, and the only place the music does too.
  // Taken from the same constants the score's silence is cut from, so the two
  // cannot drift apart.
  const frozen = elapsed >= ms2(FREEZE_IN) && elapsed < ms2(FREEZE_OUT);

  useEffect(() => {
    score.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const s = new Score();
    score.current = s;
    void s.resume();
    s.start(buildAct2Cues());
    s.setMuted(muted);
    t0.current = performance.now();

    const tick = () => {
      raf.current = requestAnimationFrame(tick);
      const e = performance.now() - t0.current;
      setElapsed(e);

      let idx = 0;
      for (let i = ACT2.length - 1; i >= 0; i--) {
        if (e >= ms2(ACT2[i].beat)) {
          idx = i;
          break;
        }
      }
      setShot((prev) => {
        if (prev !== idx) {
          const nv = videos.current[idx];
          shotStarted.current = performance.now();
          if (nv) {
            // From the first frame, every time.
            nv.currentTime = 0;
            void nv.play().catch(() => {});
          }
          // The outgoing shot keeps playing while it travels past the lens,
          // so its final frames are seen rather than cut off at the beat.
        }
        return idx;
      });

      if (e >= total) {
        cancelAnimationFrame(raf.current);
        onEnded();
      }
    };
    // The opening shot is never "changed to", so it is started explicitly.
    const first = videos.current[0];
    if (first) {
      first.currentTime = 0;
      void first.play().catch(() => {});
    }

    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      score.current?.close();
      score.current = null;
      videos.current.forEach((v) => v?.pause());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * A shot is "incoming" once we are within PREROLL of its beat — mounted,
   * playing, and invisible. That is the whole trick.
   */
  const phaseOf = (i: number): "incoming" | "current" | "outgoing" | "gone" => {
    if (i === shot) return "current";
    if (i === shot + 1 && elapsed >= ms2(ACT2[i].beat) - PREROLL) return "incoming";
    if (i === shot - 1) return "outgoing";
    return "gone";
  };

  const captions = ACT2_CAPTIONS.filter(
    (c) => elapsed >= ms2(c.beat) && elapsed < ms2(c.outBeat)
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black"
      data-act2-shot={shot}
      // How far into the current take we are, so "is it playing from the
      // start" is checkable on hardware that can actually decode it.
      data-act2-clip-t={videos.current[shot]?.currentTime.toFixed(2) ?? "-"}
    >
      {/* The glass scene pushes the frame open to the full screen, because
          what he is knocking on is meant to be the screen you are holding. */}
      <StageBackdrop active={portrait} getVideo={() => videos.current[shot]} />
      <FilmStage
        portrait={portrait}
        expand={ACT2[shot].kind === "live" && ACT2[shot].scene === "glass"}
      >
      {ACT2.map((s, i) => {
        const phase = phaseOf(i);
        if (phase === "gone") return null;
        return (
          <CutLayer key={i} phase={phase} cut={s.cut} dir={s.dir ?? 1} z={10 + i}>
            {s.kind === "clip" ? (
              <video
                ref={(el) => {
                  videos.current[i] = el;
                }}
                muted
                playsInline
                preload="auto"
                className="h-full w-full object-cover"
              >
                <source src={ACT2_CLIPS[s.clip].webm} type="video/webm" />
                <source src={ACT2_CLIPS[s.clip].mp4} type="video/mp4" />
              </video>
            ) : (
              <LiveScene
                scene={s.scene}
                active={phase === "current" || phase === "outgoing"}
                portrait={portrait}
                cap={cap}
                frozen={frozen && s.scene === "freeze"}
              />
            )}
          </CutLayer>
        );
      })}
      </FilmStage>

      <FilmDebug
        shot={shot}
        label={ACT2[shot].kind === "clip" ? ACT2[shot].clip : ACT2[shot].scene}
        video={videos.current[shot]}
        windowElapsed={performance.now() - (shotStarted.current || performance.now())}
      />

      {/* grade, matched to Act 1 so the two acts are one film */}
      <div className="pointer-events-none absolute inset-0 z-[70] bg-[radial-gradient(circle_at_50%_50%,transparent_45%,rgba(0,0,0,0.72)_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 z-[70] opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0 1px, transparent 1px 3px)",
        }}
      />

      {/* everything muffles when he snaps */}
      <AnimatePresence>
        {frozen && !prefersReducedMotion && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[71] bg-paper/[0.06]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
          />
        )}
      </AnimatePresence>

      <div
        className={`pointer-events-none absolute inset-0 z-[72] flex justify-center px-6 ${
          portrait ? "items-end pb-[20vh]" : "items-center"
        }`}
      >
        <AnimatePresence>
          {captions.map((c) => (
            <motion.div
              key={c.text}
              initial={{ opacity: 0, scale: c.kind === "wide" ? 1.2 : 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.22 } }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={captionClass(c.kind)}
            >
              {c.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[73] h-[3px] bg-paper/10">
        <div
          className="h-full bg-accent-soft"
          style={{
            width: `${Math.min(100, (elapsed / total) * 100)}%`,
            transition: "width 80ms linear",
          }}
        />
      </div>
    </div>
  );
}

function captionClass(kind: string) {
  switch (kind) {
    case "wide":
      return "w-full text-center font-display text-[9vw] font-bold leading-none tracking-tight text-paper drop-shadow-[0_0_60px_rgba(0,0,0,0.9)] sm:text-[6vw]";
    case "stamp":
      return "rounded-lg border-2 border-red-400/80 bg-black/70 px-5 py-3 text-center font-mono text-base font-bold tracking-widest text-red-300 sm:text-2xl";
    case "whisper":
      return "font-display text-[7vw] text-paper/85 sm:text-[3vw]";
    case "name":
      return "absolute bottom-[28%] left-0 right-0 text-center font-display text-[7vw] font-semibold leading-none tracking-tight text-paper sm:text-[4vw]";
    case "cta":
      return "absolute bottom-[18%] left-0 right-0 text-center font-display text-[5vw] font-bold tracking-tight text-paper sm:text-[2.4vw]";
    default:
      return "w-full text-center font-display text-[16vw] font-bold leading-none text-paper sm:text-[12vw]";
  }
}
