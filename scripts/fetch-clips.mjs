/**
 * Pull every character clip and film shot into the repo.
 *
 * Run this once on your own machine:
 *
 *     node scripts/fetch-clips.mjs
 *     git add public/clips components data && git commit -m "Host the clips ourselves" && git push
 *
 * Two things it buys:
 *
 *  - The site stops depending on a CloudFront bucket we do not control.
 *    Those URLs belong to the generator, not to you, and if they ever expire
 *    the character disappears from the portfolio.
 *  - It makes the film testable in the sandbox I work in, which cannot reach
 *    that host. Anything under public/ is served from localhost, which is on
 *    the proxy's bypass list — so with the files in the repo I can run the
 *    real thing, decode the real video, throttle the CPU to phone speed and
 *    actually measure what you are seeing.
 */
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const PREFIX = "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/";
const SOURCES = [
  "components/portfolio/avatar/clips.ts",
  "components/portfolio/ad/adClips.ts",
  "components/portfolio/ad/act2Clips.ts",
];
const OUT = "public/clips";

const names = new Set();
for (const f of SOURCES) {
  const src = await readFile(f, "utf8");
  for (const m of src.matchAll(/hf_[A-Za-z0-9_-]+\.(?:mp4|png)/g)) names.add(m[0]);
}
console.log(`${names.size} assets to fetch\n`);

await mkdir(OUT, { recursive: true });
let bytes = 0;
let done = 0;
for (const name of names) {
  const dest = `${OUT}/${name}`;
  try {
    const s = await stat(dest);
    bytes += s.size;
    done++;
    console.log(`  have  ${name}  ${(s.size / 1e6).toFixed(1)}MB`);
    continue;
  } catch {
    /* not fetched yet */
  }
  const res = await fetch(PREFIX + name);
  if (!res.ok) {
    console.error(`  FAIL  ${name}  ${res.status}`);
    continue;
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const s = await stat(dest);
  bytes += s.size;
  done++;
  console.log(`  got   ${name}  ${(s.size / 1e6).toFixed(1)}MB`);
}

console.log(`\n${done}/${names.size} files, ${(bytes / 1e6).toFixed(0)}MB total`);

// Point the code at the local copies.
for (const f of SOURCES) {
  const src = await readFile(f, "utf8");
  if (!src.includes(PREFIX)) continue;
  await writeFile(f, src.split(PREFIX).join("/clips/"));
  console.log(`rewrote ${f}`);
}
console.log("\nNow: git add public/clips components && git commit && git push");
