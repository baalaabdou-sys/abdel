"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type RebuildPhase =
  | "idle"
  | "arm"
  | "reach"
  | "shatter"
  | "survey"
  | "rebuild"
  | "css"
  | "drop"
  | "outro";

type RebuildValue = {
  phase: RebuildPhase;
  /** Bumped once per activation; the timeline is keyed on it. */
  runId: number;
  setPhase: (p: RebuildPhase) => void;
  /** True once the sequence has run at least once, for the replay label. */
  played: boolean;
  setPlayed: (v: boolean) => void;
  start: () => void;
  running: boolean;
};

const RebuildContext = createContext<RebuildValue | null>(null);

export function RebuildProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<RebuildPhase>("idle");
  const [runId, setRunId] = useState(0);
  const [played, setPlayed] = useState(false);

  const value = useMemo<RebuildValue>(
    () => ({
      phase,
      runId,
      setPhase,
      played,
      setPlayed,
      running: phase !== "idle",
      // The sequence is never automatic — this only ever runs from a tap.
      start: () => {
        if (phase !== "idle") return;
        setRunId((n) => n + 1);
        setPhase("arm");
      },
    }),
    [phase, runId, played]
  );

  return <RebuildContext.Provider value={value}>{children}</RebuildContext.Provider>;
}

export function useRebuild() {
  const ctx = useContext(RebuildContext);
  if (!ctx) throw new Error("useRebuild must be used within RebuildProvider");
  return ctx;
}
