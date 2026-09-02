'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target } from 'lucide-react';
import { NAV_GROUPS } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { can } from '@/lib/rbac';
import { useI18n } from '@/providers/i18n-provider';
import { useWorkspace } from '@/providers/workspace-provider';
import { Badge } from '@/components/ui/badge';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { role, workspaceName, isDemo } = useWorkspace();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Target className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">ASSURLEAD AI</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">{workspaceName}</p>
        </div>
      </div>

      {isDemo ? (
        <div className="px-4 pt-3">
          <Badge variant="warning" className="w-full justify-center">{t('common.demoData')}</Badge>
        </div>
      ) : null}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => can(role, item.permission));
          if (items.length === 0) return null;
          return (
            <div key={group.labelKey} className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {t(group.labelKey)}
              </p>
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t p-3">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          La délivrabilité est surveillée et optimisée. Le placement en boîte de réception ne peut
          être garanti par aucun outil.
        </p>
      </div>
    </div>
  );
}
