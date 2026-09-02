'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { formatNumber } from '@/lib/utils';

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5 text-xs text-muted-foreground">
      <span className="num">
        {formatNumber(from)}–{formatNumber(to)} sur {formatNumber(total)}
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Page précédente">
          <ChevronLeft />
        </Button>
        <span className="num px-2">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Page suivante">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
