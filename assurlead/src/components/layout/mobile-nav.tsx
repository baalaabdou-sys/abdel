'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_NAV } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { can } from '@/lib/rbac';
import { useI18n } from '@/providers/i18n-provider';
import { useWorkspace } from '@/providers/workspace-provider';

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { role } = useWorkspace();
  const items = MOBILE_NAV.filter((i) => can(role, i.permission));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="truncate px-1">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
