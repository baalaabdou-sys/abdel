import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  suffix,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  suffix?: string;
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };
  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground/70" /> : null}
      </div>
      <p className={cn('num mt-2 text-2xl font-semibold tracking-tight', tones[tone])}>
        {typeof value === 'number' ? formatNumber(value) : value}
        {suffix ? <span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
