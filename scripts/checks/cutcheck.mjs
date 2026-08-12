/**
 * Static invariants for both acts.
 *
 * This existed for Act 2 only, which is exactly why Act 1 sat with every one
 * of its eight shots cut short and nothing said so. A check that covers half
 * the thing it is checking is worse than none, because it reads as coverage.
 */
import { readFileSync } from "node:fs";

const BEAT = 500;
/** Measured from all five Act 2 containers and the entrance clip. */
const FOOTAGE_S = 5.042;
const MIN_SHOW_S = 5.0;
const MAX_HOLD_S = FOOTAGE_S + 0.6;

let fail = 0;
const bad = (m) => { console.log("  FAIL:", m); fail++; };

function check(label, file, shotRe, endRe, capRe) {
  const src = readFileSync(file, "utf8");
  const shots = [...src.matchAll(shotRe)].map((m) => ({
    kind: m[1] ?? "clip",
    name: m[2] ?? m[1],
    beat: +m[m.length - 1],
  }));
  const end = +src.match(endRe)[1];
  const caps = [...src.matchAll(capRe)].map((m) => ({ beat: +m[1], out: +m[2], text: m[3] }));
  const win = (i) => ((i + 1 < shots.length ? shots[i + 1].beat : end) - shots[i].beat) * BEAT / 1000;

  console.log(`\n── ${label}  (${shots.length} shots, ${(end * BEAT) / 1000}s)`);

  shots.forEach((s, i) => {
    if (i && s.beat <= shots[i - 1].beat) bad(`${label}: ${s.name} does not follow ${shots[i - 1].name}`);
    const d = win(i);
    if (s.kind !== "live") {
      if (d < MIN_SHOW_S) bad(`${label}: ${s.name} shows ${d}s of ${FOOTAGE_S}s footage`);
      if (d > MAX_HOLD_S) bad(`${label}: ${s.name} holds ${d}s — frozen frame at the end`);
    }
  });
  if (shots[shots.length - 1].beat >= end) bad(`${label}: last shot starts at or after the end`);

  caps.forEach((c) => {
    const i = shots.findIndex((s, j) => c.beat >= s.beat && c.beat < (j + 1 < shots.length ? shots[j + 1].beat : end));
    if (i < 0) return bad(`${label}: caption "${c.text}" is outside the film`);
    if (c.out <= c.beat) bad(`${label}: caption "${c.text}" has no duration`);
    console.log(`  "${c.text}" → ${shots[i].name}`);
  });
}

check(
  "ACT 1",
  "/home/user/abdel/data/adCut.ts",
  /\{ clip: "(\w+)", beat: (\d+)/g,
  /END_BEAT = (\d+)/,
  /\{ beat: ([\d.]+), outBeat: ([\d.]+), text: "([^"]+)"/g
);

check(
  "ACT 2",
  "/home/user/abdel/data/act2.ts",
  /kind: "(clip|live)",\s*\n\s*(?:clip|scene): "([a-z2_]+)",\s*\n\s*beat: (\d+)/g,
  /ACT2_END = (\d+)/,
  /\{ beat: ([\d.]+), outBeat: ([\d.]+), text: "([^"]+)"/g
);

// Act 2's silence must sit inside the shot it belongs to.
const a2 = readFileSync("/home/user/abdel/data/act2.ts", "utf8");
const fi = +a2.match(/FREEZE_IN = (\d+)/)[1];
const fo = +a2.match(/FREEZE_OUT = (\d+)/)[1];
const shots = [...a2.matchAll(/(?:clip|scene): "([a-z2_]+)",\s*\n\s*beat: (\d+)/g)].map((m) => ({ n: m[1], b: +m[2] }));
const f = shots.findIndex((s) => s.n === "freeze");
if (fi < shots[f].b || fo > shots[f + 1].b) bad(`freeze window ${fi}-${fo} escapes its shot`);

console.log(fail ? `\n  ${fail} FAILURE(S)` : "\n  every shot in both acts plays out in full");
process.exit(fail ? 1 : 0);
