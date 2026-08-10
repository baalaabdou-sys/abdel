"use client";

import Part, { Bar } from "./Part";

const CHART = [38, 62, 45, 78, 55, 90, 70];

function Card({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-lg border border-ink-line bg-ink/60 p-3">{children}</div>
  );
}

export default function WebsiteMockup({ variant }: { variant: string }) {
  const isDashboard = variant === "dashboard";

  return (
    <div className="w-full overflow-hidden rounded-xl border border-ink-line bg-ink-soft shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
      {/* browser chrome */}
      <Part i={0} from="down">
        <div className="flex items-center gap-2 border-b border-ink-line bg-ink/70 px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <div className="ml-3 h-4 flex-1 rounded-full bg-ink-line/70" />
        </div>
      </Part>

      {isDashboard ? (
        <div className="flex min-h-[240px]">
          <Part i={1} from="left">
            <div className="h-full w-24 space-y-2.5 border-r border-ink-line bg-ink/50 p-3">
              <div className="mb-4 h-5 w-12 rounded bg-accent/70" />
              {[0, 1, 2, 3].map((n) => (
                <Bar key={n} w={n === 0 ? "80%" : "65%"} h={7} dim={n !== 0} />
              ))}
            </div>
          </Part>
          <div className="flex-1 space-y-3 p-4">
            <Part i={2} from="up">
              <div className="flex gap-3">
                {["Revenue", "Users", "Orders"].map((label) => (
                  <div key={label} className="flex-1 rounded-lg border border-ink-line bg-ink/60 p-3">
                    <p className="text-[9px] uppercase tracking-wide text-haze">{label}</p>
                    <div className="mt-2 h-4 w-2/3 rounded bg-accent-soft/60" />
                  </div>
                ))}
              </div>
            </Part>
            <Part i={3} from="front">
              <div className="rounded-lg border border-ink-line bg-ink/60 p-4">
                <div className="flex h-24 items-end gap-2">
                  {CHART.map((h, n) => (
                    <div
                      key={n}
                      className="flex-1 rounded-t bg-gradient-to-t from-accent/40 to-accent"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </Part>
            <Part i={4} from="up">
              <div className="space-y-2 rounded-lg border border-ink-line bg-ink/60 p-3">
                {[0, 1, 2].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded bg-ink-line" />
                    <Bar w="45%" h={7} />
                    <div className="ml-auto h-3 w-10 rounded bg-accent-soft/40" />
                  </div>
                ))}
              </div>
            </Part>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {/* navbar */}
          <Part i={1} from="down">
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 rounded bg-accent/70" />
              <div className="ml-auto flex gap-3">
                {[0, 1, 2].map((n) => (
                  <Bar key={n} w="38px" h={7} dim />
                ))}
                <div className="h-6 w-16 rounded-full bg-accent" />
              </div>
            </div>
          </Part>

          {/* hero */}
          <Part i={2} from="front">
            <div className="rounded-xl border border-ink-line bg-gradient-to-br from-accent/12 via-ink/50 to-accent-soft/8 p-6">
              <div className="space-y-2.5">
                <div className="h-5 w-3/5 rounded bg-paper/80" />
                <div className="h-5 w-2/5 rounded bg-paper/60" />
                <div className="pt-1.5">
                  <Bar w="70%" h={7} dim />
                </div>
                <div className="flex gap-2 pt-3">
                  <div className="h-7 w-24 rounded-full bg-accent" />
                  <div className="h-7 w-24 rounded-full border border-ink-line" />
                </div>
              </div>
            </div>
          </Part>

          {/* category body */}
          {variant === "ecommerce" ? (
            <Part i={3} from="up">
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((n) => (
                  <div key={n} className="rounded-lg border border-ink-line bg-ink/60 p-2">
                    <div className="mb-2 h-14 rounded bg-gradient-to-br from-ink-line to-ink" />
                    <Bar w="80%" h={6} dim />
                    <div className="mt-1.5 h-3 w-10 rounded bg-accent-soft/60" />
                  </div>
                ))}
              </div>
            </Part>
          ) : (
            <Part i={3} from="up">
              <div className="flex gap-3">
                {[0, 1, 2].map((n) => (
                  <Card key={n}>
                    {variant === "business" && (
                      <div className="mb-2 h-6 w-6 rounded-full bg-accent-soft/50" />
                    )}
                    {variant === "portfolio" && (
                      <div className="mb-2 h-14 rounded bg-gradient-to-br from-ink-line to-ink" />
                    )}
                    <Bar w="75%" h={7} />
                    <div className="mt-1.5">
                      <Bar w="55%" h={6} dim />
                    </div>
                  </Card>
                ))}
              </div>
            </Part>
          )}

          {/* footer */}
          <Part i={4} from="up">
            <div className="flex items-center gap-3 border-t border-ink-line pt-3">
              <Bar w="60px" h={6} dim />
              <div className="ml-auto flex gap-2">
                {[0, 1, 2].map((n) => (
                  <div key={n} className="h-4 w-4 rounded-full bg-ink-line" />
                ))}
              </div>
            </div>
          </Part>
        </div>
      )}
    </div>
  );
}
