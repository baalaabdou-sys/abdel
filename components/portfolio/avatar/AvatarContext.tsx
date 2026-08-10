"use client";

import { createContext, useContext, useRef } from "react";
import type { ClipKey } from "./clips";

export type AnchorConfig = {
  basePose: ClipKey;
  size: number;
  flip?: boolean;
};

type AnchorEntry = { el: HTMLElement; config: AnchorConfig };

export type ActionEvent = { clip: ClipKey; flip?: boolean; holdMs?: number };

type Listener<T> = (value: T) => void;

class Emitter<T> {
  private listeners = new Set<Listener<T>>();
  on(cb: Listener<T>) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  emit(value: T) {
    this.listeners.forEach((cb) => cb(value));
  }
}

type AvatarContextValue = {
  anchors: Map<string, AnchorEntry>;
  actionEmitter: Emitter<ActionEvent>;
  registerAnchor: (id: string, el: HTMLElement | null, config: AnchorConfig) => void;
  requestAction: (clip: ClipKey, opts?: { flip?: boolean; holdMs?: number }) => void;
};

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const anchors = useRef(new Map<string, AnchorEntry>()).current;
  const actionEmitter = useRef(new Emitter<ActionEvent>()).current;

  const value = useRef<AvatarContextValue>({
    anchors,
    actionEmitter,
    registerAnchor: (id, el, config) => {
      if (el) anchors.set(id, { el, config });
      else anchors.delete(id);
    },
    requestAction: (clip, opts) => actionEmitter.emit({ clip, ...opts }),
  }).current;

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatarContext() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error("useAvatarContext must be used within AvatarProvider");
  return ctx;
}

export function useAvatarAnchor(id: string, config: AnchorConfig) {
  const ctx = useAvatarContext();
  const configRef = useRef(config);
  configRef.current = config;

  return (el: HTMLElement | null) => {
    ctx.registerAnchor(id, el, configRef.current);
  };
}
