"use client";

import Part, { Bar } from "./Part";

const SPARK = [30, 55, 40, 70, 52, 85, 64];

export default function AppMockup({ variant }: { variant: string }) {
  return (
    <div className="mx-auto w-[220px] overflow-hidden rounded-[2rem] border-[6px] border-ink-line bg-ink-soft shadow-[0_30px_80px_-25px_rgba(0,0,0,0.85)]">
      {/* notch + status bar */}
      <Part i={0} from="down">
        <div className="relative bg-ink/70 px-4 pb-2 pt-2.5">
          <div className="absolute left-1/2 top-1 h-3.5 w-16 -translate-x-1/2 rounded-b-xl bg-ink-line" />
          <div className="flex items-center justify-between pt-2 text-[8px] text-haze">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-haze/60" />
              <div className="h-1.5 w-3 rounded-sm bg-haze/60" />
            </div>
          </div>
        </div>
      </Part>

      <div className="min-h-[300px] space-y-3 p-3">
        {variant === "finance" && (
          <>
            <Part i={1} from="front">
              <div className="rounded-xl bg-gradient-to-br from-accent to-accent/60 p-3.5">
                <p className="text-[8px] uppercase tracking-wide text-ink/70">Balance</p>
                <p className="mt-1 font-display text-xl font-semibold text-ink">12 480 DH</p>
              </div>
            </Part>
            <Part i={2} from="up">
              <div className="rounded-xl border border-ink-line bg-ink/60 p-3">
                <div className="flex h-16 items-end gap-1.5">
                  {SPARK.map((h, n) => (
                    <div
                      key={n}
                      className="flex-1 rounded-t bg-accent-soft/70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </Part>
            <Part i={3} from="up">
              <div className="space-y-2">
                {[0, 1, 2].map((n) => (
                  <div key={n} className="flex items-center gap-2.5 rounded-lg border border-ink-line bg-ink/50 p-2.5">
                    <div className="h-6 w-6 rounded-full bg-ink-line" />
                    <div className="flex-1 space-y-1">
                      <Bar w="65%" h={6} />
                      <Bar w="40%" h={5} dim />
                    </div>
                    <div className="h-3 w-8 rounded bg-accent-soft/50" />
                  </div>
                ))}
              </div>
            </Part>
          </>
        )}

        {variant === "delivery" && (
          <>
            <Part i={1} from="front">
              <div className="relative h-28 overflow-hidden rounded-xl border border-ink-line bg-gradient-to-br from-ink to-ink-soft">
                <svg viewBox="0 0 200 110" className="absolute inset-0 h-full w-full">
                  <path
                    d="M20 90 C60 70, 70 40, 110 35 S170 30, 180 18"
                    fill="none"
                    stroke="#5EE6D0"
                    strokeWidth="3"
                    strokeDasharray="6 5"
                  />
                  <circle cx="20" cy="90" r="5" fill="#8B7CFF" />
                  <circle cx="180" cy="18" r="5" fill="#5EE6D0" />
                </svg>
              </div>
            </Part>
            <Part i={2} from="up">
              <div className="rounded-xl border border-ink-line bg-ink/60 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-ink-line" />
                  <div className="flex-1 space-y-1.5">
                    <Bar w="70%" h={7} />
                    <Bar w="45%" h={5} dim />
                  </div>
                </div>
              </div>
            </Part>
            <Part i={3} from="up">
              <div className="space-y-2.5 rounded-xl border border-ink-line bg-ink/50 p-3">
                {["Confirmed", "Preparing", "On the way"].map((s, n) => (
                  <div key={s} className="flex items-center gap-2.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${n < 2 ? "bg-accent-soft" : "bg-ink-line"}`}
                    />
                    <span className="text-[9px] text-haze">{s}</span>
                  </div>
                ))}
              </div>
            </Part>
          </>
        )}

        {variant === "social" && (
          <>
            <Part i={1} from="right">
              <div className="flex gap-2.5">
                {[0, 1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`h-9 w-9 shrink-0 rounded-full ${n === 0 ? "bg-gradient-to-br from-accent to-accent-soft" : "bg-ink-line"}`}
                  />
                ))}
              </div>
            </Part>
            <Part i={2} from="front">
              <div className="overflow-hidden rounded-xl border border-ink-line bg-ink/60">
                <div className="flex items-center gap-2 p-2.5">
                  <div className="h-6 w-6 rounded-full bg-ink-line" />
                  <Bar w="45%" h={6} />
                </div>
                <div className="h-24 bg-gradient-to-br from-ink-line to-ink" />
                <div className="flex gap-3 p-2.5">
                  <div className="h-3.5 w-3.5 rounded-full bg-accent/70" />
                  <div className="h-3.5 w-3.5 rounded-full bg-ink-line" />
                  <div className="h-3.5 w-3.5 rounded-full bg-ink-line" />
                </div>
              </div>
            </Part>
            <Part i={3} from="up">
              <div className="flex items-center gap-2 rounded-xl border border-ink-line bg-ink/50 p-2.5">
                <div className="h-6 w-6 rounded-full bg-ink-line" />
                <Bar w="60%" h={6} dim />
              </div>
            </Part>
          </>
        )}

        {variant === "admin" && (
          <>
            <Part i={1} from="up">
              <div className="grid grid-cols-2 gap-2.5">
                {["Active", "Pending", "Staff", "Alerts"].map((label) => (
                  <div key={label} className="rounded-lg border border-ink-line bg-ink/60 p-2.5">
                    <p className="text-[8px] uppercase tracking-wide text-haze">{label}</p>
                    <div className="mt-1.5 h-3.5 w-2/3 rounded bg-accent-soft/60" />
                  </div>
                ))}
              </div>
            </Part>
            <Part i={2} from="front">
              <div className="space-y-2 rounded-xl border border-ink-line bg-ink/60 p-3">
                {[0, 1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-ink-line" />
                    <Bar w="50%" h={6} dim />
                    <div
                      className={`ml-auto h-3 w-7 rounded-full ${n % 2 === 0 ? "bg-accent/70" : "bg-ink-line"}`}
                    />
                  </div>
                ))}
              </div>
            </Part>
          </>
        )}
      </div>

      {/* tab bar */}
      <Part i={4} from="up">
        <div className="flex items-center justify-around border-t border-ink-line bg-ink/70 px-4 py-2.5">
          {[0, 1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-4 w-4 rounded ${n === 0 ? "bg-accent" : "bg-ink-line"}`}
            />
          ))}
        </div>
      </Part>
    </div>
  );
}
