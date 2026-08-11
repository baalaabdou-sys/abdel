"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type AdValue = {
  open: boolean;
  runId: number;
  /** How much of the film is worth fetching yet. */
  warmth: "none" | "peek" | "full";
  warm: (level: "peek" | "full") => void;
  start: () => void;
  close: () => void;
  replay: () => void;
};

const AdContext = createContext<AdValue | null>(null);

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [runId, setRunId] = useState(0);
  const [warmth, setWarmth] = useState<"none" | "peek" | "full">("none");

  const warm = useCallback((level: "peek" | "full") => {
    setWarmth((w) => (w === "full" || (w === "peek" && level === "peek") ? w : level));
  }, []);

  const value = useMemo<AdValue>(
    () => ({
      open,
      runId,
      warmth,
      warm,
      start: () => {
        setWarmth("full");
        setRunId((n) => n + 1);
        setOpen(true);
      },
      close: () => setOpen(false),
      replay: () => setRunId((n) => n + 1),
    }),
    [open, runId, warmth, warm]
  );

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAd() {
  const ctx = useContext(AdContext);
  if (!ctx) throw new Error("useAd must be used within AdProvider");
  return ctx;
}
