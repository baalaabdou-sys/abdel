'use client';
import { formatNumber, pct } from '@/lib/utils';
import { cn } from '@/lib/utils';

export type FunnelStep = { label: string; value: number; hint?: string };

/**
 * Conversion funnel. Widths are proportional to the first step, and each row
 * shows the step-to-step conversion so the drop-off point is obvious.
 */
export function FunnelChart({ steps, className }: { steps: FunnelStep[]; className?: string }) {
  const top = Math.max(1, steps[0]?.value ?? 1);

  return (
    <div className={cn('space-y-1.5', className)}>
      {steps.map((step, i) => {
        const previous = i === 0 ? null : steps[i - 1].value;
        const conversion = previous === null ? null : pct(step.value, previous);
        const width = Math.max(2, (step.value / top) * 100);
        const dropOff = conversion !== null && conversion < 40 && (previous ?? 0) > 0;

        return (
          <div key={step.label} className="group">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{step.label}</span>
              <span className="flex items-center gap-2">
                {conversion !== null ? (
                  <span className={cn('num text-[11px]', dropOff ? 'text-warning' : 'text-muted-foreground')}>
                    {conversion} %
                  </span>
                ) : null}
                <span className="num font-semibold tabular-nums">{formatNumber(step.value)}</span>
              </span>
            </div>
            <div className="mt-1 h-6 w-full overflow-hidden rounded bg-muted/60">
              <div
                className={cn(
                  'h-full rounded transition-all',
                  i === steps.length - 1 ? 'bg-success' : dropOff ? 'bg-warning' : 'bg-primary',
                )}
                style={{ width: `${width}%`, opacity: 1 - i * 0.06 }}
              />
            </div>
            {step.hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{step.hint}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
