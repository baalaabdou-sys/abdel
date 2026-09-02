import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center', className)}>
      {Icon ? (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mx-auto max-w-md text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-destructive">{title}</p>
      {description ? <p className="max-w-md text-xs text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
