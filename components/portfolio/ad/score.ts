"use client";

/**
 * The ad's sound design.
 *
 * Synthesised in WebAudio rather than shipped as a file: it costs no
 * bandwidth, and — more importantly — the edit and the score are generated
 * from the same beat grid, so the cuts land on the hits by construction
 * instead of by hoping two timelines stay aligned.
 *
 * Nothing is created until the visitor presses Watch Ad, which is also what
 * satisfies the browser's autoplay rules.
 */

/** 120bpm — every beat is 500ms, every bar 2s. */
export const BPM = 120;
export const BEAT = 60000 / BPM;

export type Hit =
  | "click"
  | "riser"
  | "drop"
  | "kick"
  | "sub"
  | "hat"
  | "whoosh"
  | "impact"
  | "ui"
  | "glitch"
  | "keys"
  | "portal"
  | "glasses"
  | "tail";

export class Score {
  private ctx: AudioContext;
  private master: GainNode;
  private music: GainNode;
  private startedAt = 0;
  private stopped = false;

  constructor() {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    // Deliberately well below unity. Loud is the music's job, not the gain's.
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 1;
    this.music.connect(this.master);
  }

  get currentTime() {
    return this.ctx.currentTime;
  }

  /** "running" once the browser has allowed audio — useful when debugging
      autoplay policy on a real device. */
  get state() {
    return this.ctx.state;
  }

  /** How many events the film scheduled. */
  scheduled = 0;

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  /** Fade the bed out — used for the silence before the hero shot. */
  cutMusic(atMs: number) {
    const t = this.startedAt + atMs / 1000;
    this.music.gain.setValueAtTime(1, t - 0.05);
    this.music.gain.linearRampToValueAtTime(0, t + 0.12);
  }

  close() {
    this.stopped = true;
    void this.ctx.close();
  }

  /** Schedule the whole score up front, sample-accurate. */
  start(cues: [number, Hit][]) {
    this.startedAt = this.ctx.currentTime + 0.12;
    cues.forEach(([ms, hit]) => this.schedule(this.startedAt + ms / 1000, hit));
    this.scheduled = cues.length;
    return this.startedAt;
  }

  private osc(t: number, from: number, to: number, dur: number, gain: number, type: OscillatorType, bus: GainNode) {
    if (this.stopped) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(18, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private noise(t: number, dur: number, gain: number, hz: number, type: BiquadFilterType, bus: GainNode, sweepTo?: number) {
    if (this.stopped) return;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(hz, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t);
  }

  private schedule(t: number, hit: Hit) {
    const m = this.music;
    const x = this.master;
    switch (hit) {
      case "click":
        this.noise(t, 0.035, 0.5, 3000, "bandpass", x);
        break;
      case "riser":
        this.noise(t, 1.4, 0.32, 300, "highpass", m, 7000);
        this.osc(t, 90, 900, 1.4, 0.12, "sawtooth", m);
        break;
      case "drop":
        this.osc(t, 140, 32, 1.1, 0.85, "sine", m);
        this.noise(t, 0.7, 0.55, 1800, "lowpass", m);
        this.osc(t, 60, 40, 0.9, 0.3, "square", m);
        break;
      case "kick":
        this.osc(t, 130, 40, 0.24, 0.6, "sine", m);
        this.noise(t, 0.03, 0.22, 2200, "lowpass", m);
        break;
      case "sub":
        this.osc(t, 55, 44, 0.55, 0.42, "sine", m);
        break;
      case "hat":
        this.noise(t, 0.035, 0.14, 8000, "highpass", m);
        break;
      case "whoosh":
        this.noise(t, 0.45, 0.4, 400, "bandpass", x, 5200);
        break;
      case "impact":
        this.osc(t, 180, 38, 0.55, 0.65, "sine", x);
        this.noise(t, 0.32, 0.42, 1400, "lowpass", x);
        break;
      case "ui":
        this.osc(t, 1750, 900, 0.05, 0.3, "square", x);
        break;
      case "glitch":
        this.noise(t, 0.16, 0.4, 4200, "bandpass", x);
        this.osc(t, 1200, 180, 0.14, 0.22, "sawtooth", x);
        break;
      case "keys":
        for (let i = 0; i < 6; i++) this.osc(t + i * 0.045, 2200 - i * 90, 1200, 0.03, 0.18, "square", x);
        break;
      case "portal":
        this.osc(t, 220, 1400, 0.5, 0.2, "sine", x);
        this.noise(t, 0.5, 0.3, 900, "bandpass", x, 6000);
        break;
      case "glasses":
        this.osc(t, 2600, 2100, 0.045, 0.2, "sine", x);
        break;
      case "tail":
        this.osc(t, 70, 30, 2.6, 0.28, "sine", x);
        break;
    }
  }
}
