/**
 * What is actually floating around in there.
 *
 * These are real things I keep circling back to — half of them started as a
 * problem someone described to me. The status is honest: most are ideas, a
 * few are running.
 */

export type Region = "apps" | "sites" | "ai" | "code";
export type Status = "IDEA" | "EXPERIMENT" | "PROTOTYPE" | "BUILDING…";

export type Thought = {
  id: string;
  region: Region | "secret";
  title: string;
  status: Status;
  /** One line, said plainly. */
  line: string;
  /** Fragments, not paragraphs. */
  notes: string[];
  stack: string[];
  /** Where it floats, as a percentage of the scene box. */
  pos: { x: number; y: number; z: number };
};

export const REGIONS: { id: Region; label: string; cmd: string; hint: string }[] = [
  { id: "apps", label: "Apps I want to build", cmd: "cd ~/apps", hint: "phones, mostly" },
  { id: "sites", label: "Website ideas", cmd: "cd ~/sites", hint: "some are wireframes" },
  { id: "ai", label: "AI experiments", cmd: "cd ~/ai", hint: "attached to real products" },
  { id: "code", label: "Code & architecture", cmd: "cd ~/code", hint: "how it holds together" },
];

export const THOUGHTS: Thought[] = [
  // ── apps ────────────────────────────────────────────────
  {
    id: "souk",
    region: "apps",
    title: "Souk Stock",
    status: "PROTOTYPE",
    line: "Inventory for shops that run on WhatsApp and a notebook.",
    notes: ["photo → item", "voice note → order", "works offline", "Darija first"],
    stack: ["React Native", "Node", "SQLite sync"],
    pos: { x: 18, y: 26, z: -140 },
  },
  {
    id: "shift",
    region: "apps",
    title: "Shift",
    status: "IDEA",
    line: "Attendance without the fingerprint machine politics.",
    notes: ["geofence check-in", "manager sees one screen", "payroll export"],
    stack: ["Expo", "Supabase"],
    pos: { x: 62, y: 62, z: -280 },
  },
  {
    id: "tabib",
    region: "apps",
    title: "Queue",
    status: "BUILDING…",
    line: "A waiting room you don't sit in — clinics, barbers, mechanics.",
    notes: ["live position", "SMS when close", "no app for the customer"],
    stack: ["Next.js", "Twilio", "Postgres"],
    pos: { x: 78, y: 22, z: -80 },
  },

  // ── sites ───────────────────────────────────────────────
  {
    id: "atelier",
    region: "sites",
    title: "Atelier",
    status: "EXPERIMENT",
    line: "A leather workshop site where the product is scanned, not photographed.",
    notes: ["3D turntable", "grain you can zoom", "order by message"],
    stack: ["Next.js", "R3F", "Sanity"],
    pos: { x: 22, y: 58, z: -200 },
  },
  {
    id: "menuos",
    region: "sites",
    title: "Menu OS",
    status: "PROTOTYPE",
    line: "One QR, one menu, every café in the street on the same backend.",
    notes: ["edit from a phone", "prices in two currencies", "no app store"],
    stack: ["Next.js", "Edge config"],
    pos: { x: 55, y: 24, z: -120 },
  },
  {
    id: "portfolios",
    region: "sites",
    title: "Sites that move",
    status: "IDEA",
    line: "Portfolios where the character is the navigation.",
    notes: ["you are looking at one", "clip engine, not GIFs", "mobile first"],
    stack: ["Framer Motion", "chroma key"],
    pos: { x: 80, y: 64, z: -300 },
  },

  // ── ai ──────────────────────────────────────────────────
  {
    id: "agent",
    region: "ai",
    title: "The order agent",
    status: "BUILDING…",
    line: "Reads WhatsApp messages, files them as real orders.",
    notes: ["intent + amount + item", "asks when unsure", "never invents a price"],
    stack: ["Gemini", "Node", "queue"],
    pos: { x: 24, y: 30, z: -160 },
  },
  {
    id: "vidfactory",
    region: "ai",
    title: "Character factory",
    status: "EXPERIMENT",
    line: "One reference image, a whole vocabulary of clips.",
    notes: ["consistency is the hard part", "green screen everything", "key in the browser"],
    stack: ["video models", "canvas"],
    pos: { x: 66, y: 58, z: -240 },
  },
  {
    id: "docs",
    region: "ai",
    title: "Paper eater",
    status: "IDEA",
    line: "Point a phone at an invoice, get a row in the ERP.",
    notes: ["Arabic + French handwriting", "confidence score", "human approves"],
    stack: ["OCR", "Gemini", "ERP API"],
    pos: { x: 84, y: 28, z: -100 },
  },

  // ── code ────────────────────────────────────────────────
  {
    id: "arch",
    region: "code",
    title: "Frontend → API → Backend → DB",
    status: "IDEA",
    line: "The shape almost everything I build ends up taking.",
    notes: ["typed at every hop", "one source of truth", "boring on purpose"],
    stack: ["TypeScript", "REST", "Postgres"],
    pos: { x: 26, y: 60, z: -180 },
  },
  {
    id: "qr",
    region: "code",
    title: "QR that survives design",
    status: "PROTOTYPE",
    line: "Decorate the matrix without breaking the scan.",
    notes: ["error correction budget", "contrast floor 7:1", "test the decode, not the look"],
    stack: ["qrcode", "SVG", "jsQR"],
    pos: { x: 58, y: 26, z: -140 },
  },
  {
    id: "engine",
    region: "code",
    title: "State machine for a character",
    status: "BUILDING…",
    line: "Priorities, holds, and a rule that a click always wins.",
    notes: ["ambient vs action", "preload what's next", "device tiers"],
    stack: ["React", "MotionValue"],
    pos: { x: 82, y: 62, z: -260 },
  },

  // ── the one that isn't labelled ─────────────────────────
  {
    id: "secret",
    region: "secret",
    title: "???",
    status: "IDEA",
    line: "Not yet.",
    notes: [],
    stack: [],
    pos: { x: 92, y: 84, z: -360 },
  },
];

/** The debris that rushes past on the way in. */
export const FRAGMENTS = [
  "</>", "React", "TypeScript", "Python", "SELECT *", "POST /api", "useEffect",
  "Postgres", "{ }", "flex", "grid", "#5EE6D0", "npm run dev", "git push",
  "<div>", "props", "async", "await", "Tailwind", "Next.js", "docker",
  "200 OK", "404", "JSON", "schema", "index.tsx", "styled", "hover:", "z-50",
  "QR", "matrix", "canvas", "chroma", "Gemini", "prompt", "agent", "cron",
];
