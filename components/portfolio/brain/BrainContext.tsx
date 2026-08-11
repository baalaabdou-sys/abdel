"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type BrainPhase =
  | "closed"
  /** He looks at you and decides whether to let you in. */
  | "invite"
  /** The lens fills the screen and we fall into it. */
  | "lens"
  /** Fragments rushing past. */
  | "tunnel"
  /** Too many ideas at once, then he tidies them. */
  | "flood"
  /** Free exploration. */
  | "world"
  /** He pulls you back out. */
  | "exit";

type BrainValue = {
  phase: BrainPhase;
  setPhase: (p: BrainPhase) => void;
  runId: number;
  open: boolean;
  enter: () => void;
  leave: () => void;
};

const BrainContext = createContext<BrainValue | null>(null);

export function BrainProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<BrainPhase>("closed");
  const [runId, setRunId] = useState(0);

  const value = useMemo<BrainValue>(
    () => ({
      phase,
      setPhase,
      runId,
      open: phase !== "closed",
      // Only ever from a press. Nothing on this page opens it automatically.
      enter: () => {
        if (phase !== "closed") return;
        setRunId((n) => n + 1);
        setPhase("invite");
      },
      leave: () => setPhase((p) => (p === "world" ? "exit" : p)),
    }),
    [phase, runId]
  );

  return <BrainContext.Provider value={value}>{children}</BrainContext.Provider>;
}

export function useBrain() {
  const ctx = useContext(BrainContext);
  if (!ctx) throw new Error("useBrain must be used within BrainProvider");
  return ctx;
}
