# Portfolio — handoff

Everything a fresh session needs. Written because the previous work happened in
a sandbox that could not load video, and that limitation caused most of the
bugs listed under "How this went wrong".

## The project

Next.js 14 App Router portfolio for Abderrahmane Baalla. One page, plus
`/projects/cafe`. No API routes, no middleware, no env vars, no secrets —
everything is prerendered static.

    repo    github.com/baalaabdou-sys/abdel
    branch  claude/creative-portfolio-site-h90ljq      <- ALL the work is here
    remote  c2ac6c2

**The default branch is `claude/cafe-al-fadili-menu-eqzr7t` — the café menu, a
different project.** Cloning without checking out the portfolio branch gives
you the wrong code. This has broken two Netlify deploys already.

    git clone https://github.com/baalaabdou-sys/abdel.git
    cd abdel
    git checkout claude/creative-portfolio-site-h90ljq
    npm install
    npm run dev

## What is in it

Ordinary portfolio sections (hero, work, skills, an interactive build studio
with a genuinely scannable QR generator, about, contact) plus a character who
lives on the page — chroma-keyed video clips composited over the DOM, driven by
a small state machine.

On top of that are four opt-in experiences. None autoplay; each is a fixed
overlay over the untouched page, freezes scroll by cancelling the gesture
rather than moving the document, and restores the exact scroll position, form
values and selections on exit.

| where | what |
|---|---|
| first visit | **Portal entrance.** He catches an arrow cursor, tears the page open; the portal is punched through the intro layer as a growing hole in its mask, so what you see inside it *is* the live site. Once per session. |
| About | **Break the portfolio.** He tears the page down to wireframes and rebuilds it. Real sections, moved by inline transforms whose prior values are recorded and restored. |
| Skills | **Enter my brain.** Falls through his lens into an idea world with a terminal, floating thoughts and one unlabelled secret. |
| Hero | **Watch ad.** Act 1 (40s, 8 shots) → an unstable interstitial with a Continue button that dodges → a silent cursor beat → Act 2 (88s, 18 shots). |

Act 2 mixes generated footage with scenes drawn live in the DOM. That is
deliberate: the crack has to split *this* viewport, the glass he knocks on has
to be the visitor's own screen, and the final pull-back has to land on the real
portfolio. Video cannot do those.

## Verified, and how

Measured in a browser with real video decoding, sampling `video.currentTime`
about 21 times per shot:

    a2_cursor_pull  0.14s -> 4.85s   plays in full
    a2_city_surf    0.22s -> 4.92s   plays in full
    a2_code_run     0.00s -> 4.92s   plays in full
    a2_error_fall   0.00s -> 4.92s   plays in full
    a2_chase        0.16s -> 4.96s   plays in full

Every clip is 5.042s at 1280x720, read from the containers. Both acts run every
shot to its full length.

Also measured, mobile 390x844 and desktop 1440x900: all 18 Act 2 shots reached,
end card with all four choices, scroll restored to the press position, a typed
QR value surviving both acts, no overlay or class left behind, 0 page errors,
0px horizontal overflow.

## NOT verified — needs a human or a real device

1. **Smoothness on a real phone.** Chroma-key cost was cut from seven
   full-resolution per-pixel passes to four at a fifth the resolution, but that
   is arithmetic, not a frame rate on a Redmi Note 10. The user has reported
   lag more than once. This is the most valuable thing to check.
2. **Whether the Act 2 match cuts read as invisible.** Individual frames have
   been inspected; the film has never been watched playing.
3. **Whether the portal hand-over lands on the right frame.** It starts 1.3s
   before the end of the entrance clip. From the frames: he grips the arrow at
   2.6s, the tear opens at 2.85s, the city is visible by 3.35s, he is pulled
   out by 4.6s. One number in `components/portfolio/intro/introClip.ts`.
4. **A real phone scanning a generated QR code.**

## How this went wrong, so it does not repeat

Every serious bug had the same shape: **a check that read the data instead of
the picture, and passed.**

- Shots were given 4.5s windows for 5.042s of footage. The check had a 4s
  floor — a bar set at "not catastrophic" rather than "correct" — so it passed.
- The same check only read Act 2. Act 1 sat with all eight shots cut, one of
  them showing 3s of a 5s take, and nothing said so.
- Windows were then correct at 5s, and the player still revealed every shot
  0.7s into itself, because the preroll that warms the next clip also played
  it. A static check cannot see that.
- The glass knock was made "instant" but only 1.4% of scale — invisible. Fixed
  timing, unfixed perception.

If you change timing, verify by sampling `video.currentTime` in a real
browser, not by reading the beat grid.

## Tools

    node scripts/checks/cutcheck.mjs      # static invariants for both acts
    node scripts/checks/act2.js           # full two-act playthrough
    node scripts/checks/clipprobe.js      # per-clip playback, keyed by filename
    node scripts/checks/rb.js             # break-the-portfolio sequence
    node scripts/checks/brain.js          # enter-my-brain experience

The playthrough scripts need Playwright and a dev server; edit the URL at the
top of each. They set `sessionStorage.intro-seen` so the entrance does not
block them.

In the browser, `?filmdebug=1` shows a live readout during either act: shot
index, the clip's own `currentTime` against its duration, how long the shot has
held the frame, the lag between them, and `readyState`. The `clip` line should
run 0.00 -> ~5.04 in every shot and reset at each cut. It turns red on its own
when it does not.

Observable attributes: `data-act2-shot`, `data-act2-clip-t`, `data-ad-scene`,
`data-ad-state`, `data-character-state`, `data-character-keying`,
`data-film-stage`.

## Assets

The five Act 2 clips and the entrance shot live in `public/clips` as mp4. The
27 character clips are still on the generator's CloudFront bucket — URLs we do
not own, which can rot. `node scripts/fetch-clips.mjs` pulls them into
`public/clips` and repoints the code. Worth doing.

`ffmpeg-static` from npm gives a full ffmpeg if the machine has none:
transcoding the clips to VP9 cuts them about 70% (1.65MB -> 0.49MB).

## Open items

- One commit could not be pushed: **cf9c623**, VP9 encodes plus dual `<source>`
  wiring. The session's git credential was authenticated as a different GitHub
  account with no write access. Sent to the user as `act2-vp9.bundle`. Purely a
  size optimisation — without the .webm files the `<source>` list falls through
  to the mp4s, which is current behaviour.
- Two QR gallery entries are still placeholders (Instagram standee, business
  card) pending artwork.
- `package.json` is still named `cafe-al-fadili` from when the repo began as
  the café menu. Cosmetic.
- Act 2's entrance shot is the same take the site opens on. Intentional — it
  reads as a callback — but worth confirming with the user.

## Testing on the phone

    npm run dev -- -H 0.0.0.0

Then `http://<pc-ip>:3000` on the phone, same wifi. `ipconfig` for the IP;
Windows Firewall needs to allow Node. This is the loop that matters — the user
has said repeatedly that mobile is more important than desktop.
