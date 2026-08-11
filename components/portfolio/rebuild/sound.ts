"use client";

/**
 * Tiny synthesised sound bed for the rebuild sequence.
 *
 * Everything is generated with WebAudio — no audio files, so this costs no
 * bandwidth on mobile. It is off until the visitor turns it on, the context
 * is only created after that first gesture, and nothing here is loud: the
 * master gain is capped well below unity.
 */

export type Cue = "glitch" | "fall" | "snap" | "css" | "boom" | "glasses";

const KEY = "rb-sound";

export function soundEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "on";
}

export function setSoundEnabled(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode — the toggle just won't persist */
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    // Hard ceiling. Nothing in this sequence should ever be startling.
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(duration: number, gain: number, filterHz: number) {
  const c = audio();
  if (!c || !master) return;
  const frames = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = filterHz;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(lp).connect(g).connect(master);
  src.start();
}

function tone(from: number, to: number, duration: number, gain: number, type: OscillatorType) {
  const c = audio();
  if (!c || !master) return;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), c.currentTime + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g).connect(master);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

export function playCue(cue: Cue) {
  if (!soundEnabled()) return;
  switch (cue) {
    case "glitch":
      noise(0.26, 0.5, 5200);
      tone(900, 180, 0.24, 0.16, "sawtooth");
      break;
    case "fall":
      tone(420 + Math.random() * 260, 120, 0.1, 0.1, "triangle");
      break;
    case "snap":
      tone(1500, 620, 0.06, 0.14, "square");
      noise(0.05, 0.18, 8000);
      break;
    case "css":
      tone(220, 60, 0.5, 0.34, "sine");
      noise(0.4, 0.42, 2400);
      break;
    case "boom":
      tone(150, 34, 0.9, 0.5, "sine");
      noise(0.7, 0.5, 1400);
      break;
    case "glasses":
      tone(2400, 1900, 0.05, 0.09, "sine");
      break;
  }
}
