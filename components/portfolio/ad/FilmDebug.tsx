"use client";

import { useEffect, useState } from "react";

/**
 * A readout of what the player is really doing, shown only when the page is
 * opened with ?filmdebug=1.
 *
 * It exists because the checks that live in this repo read the *edit* — the
 * beat each shot starts on, how long its window is — and cannot see what the
 * <video> element inside that window actually did. Twice now the edit has been
 * correct while the picture was not. This reports the picture.
 *
 * The line that matters is `clip`. It should climb from 0.00 to about 5.04 in
 * every shot and reset to 0.00 at each cut. Anything else is a shot being cut
 * short, and the reason will be on the same line.
 */
export default function FilmDebug({
  shot,
  label,
  video,
  windowElapsed,
}: {
  shot: number;
  label: string;
  video: HTMLVideoElement | null | undefined;
  /** ms since this shot took the frame */
  windowElapsed: number;
}) {
  const [on, setOn] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    setOn(new URLSearchParams(window.location.search).get("filmdebug") === "1");
  }, []);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [on]);

  if (!on) return null;

  const t = video?.currentTime ?? 0;
  const d = video?.duration ?? 0;
  const rs = video?.readyState ?? 0;
  const w = windowElapsed / 1000;
  // Playback should keep pace with the window. If it does not, the shot is
  // being cut off by the clock rather than by the edit.
  const lag = w - t;
  const bad = video ? lag > 0.35 || t > 0.25 : false;

  return (
    <div
      className="pointer-events-none absolute left-2 top-2 z-[99] rounded bg-black/85 px-2 py-1.5 font-mono text-[10px] leading-tight text-paper"
      style={{ minWidth: 190 }}
    >
      <div className="text-accent">shot {shot} · {label}</div>
      <div className={bad ? "text-red-400" : "text-paper"}>
        clip {t.toFixed(2)} / {d ? d.toFixed(2) : "?"}
      </div>
      <div>window {w.toFixed(2)}</div>
      <div className={lag > 0.35 ? "text-red-400" : "text-haze"}>
        lag {lag.toFixed(2)}s {lag > 0.35 ? "← STALLING" : ""}
      </div>
      <div className={rs < 3 ? "text-red-400" : "text-haze"}>
        readyState {rs} {rs < 3 ? "← not buffered" : ""}
      </div>
    </div>
  );
}
