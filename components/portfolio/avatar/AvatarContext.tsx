"use client";

import { createContext, useContext, useRef } from "react";
import type { ClipKey } from "./clips";
import { STATES, type CharacterState } from "./states";

export type AnchorConfig = {
  /** Ambient state while this section owns the character. */
  basePose: CharacterState;
  size: number;
  flip?: boolean;
};

type AnchorEntry = { el: HTMLElement; config: AnchorConfig };

export type ActionEvent = {
  state: CharacterState;
  flip?: boolean;
  holdMs?: number;
  /** Run this state immediately after, for choreographed sequences. */
  then?: CharacterState;
};

/** Where the visitor's pointer or last touch is, in viewport pixels. */
export type PointerState = { x: number; y: number; active: boolean; isTouch: boolean };

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
  warmEmitter: Emitter<ClipKey>;
  pointer: PointerState;
  registerAnchor: (id: string, el: HTMLElement | null, config: AnchorConfig) => void;
  /**
   * Ask the character to do something. Lower-priority requests are dropped
   * while a higher-priority one is still running, so a hover can never
   * interrupt a portal jump or the malfunction easter egg.
   */
  play: (state: CharacterState, opts?: { flip?: boolean; holdMs?: number; then?: CharacterState }) => void;
  warmClip: (clip: ClipKey) => void;
  /** Priority of whatever is on screen right now; 0 when ambient. */
  activePriority: () => number;
};

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const anchors = useRef(new Map<string, AnchorEntry>()).current;
  const actionEmitter = useRef(new Emitter<ActionEvent>()).current;
  const warmEmitter = useRef(new Emitter<ClipKey>()).current;
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: false, isTouch: false }).current;

  // Priority + expiry of the currently playing action, tracked here so callers
  // can ask before firing and so the stage stays a pure renderer.
  const active = useRef({ priority: 0, until: 0 });

  const value = useRef<AvatarContextValue>({
    anchors,
    actionEmitter,
    warmEmitter,
    pointer,
    registerAnchor: (id, el, config) => {
      if (el) anchors.set(id, { el, config });
      else anchors.delete(id);
    },
    play: (state, opts) => {
      const def = STATES[state];
      const now = Date.now();
      if (now < active.current.until && def.priority < active.current.priority) return;
      const hold = opts?.holdMs ?? def.hold;
      active.current = { priority: def.priority, until: now + hold };
      actionEmitter.emit({ state, flip: opts?.flip, holdMs: hold, then: opts?.then ?? def.then });
    },
    warmClip: (clip) => warmEmitter.emit(clip),
    activePriority: () => (Date.now() < active.current.until ? active.current.priority : 0),
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
