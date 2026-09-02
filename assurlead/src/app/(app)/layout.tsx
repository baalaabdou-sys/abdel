import { redirect } from 'next/navigation';
import { getWorkspaceContext, listUserWorkspaces } from '@/lib/auth';
import { SidebarNav } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { I18nProvider } from '@/providers/i18n-provider';
import { WorkspaceProvider } from '@/providers/workspace-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { isLocale } from '@/i18n/config';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect('/login');

  const memberships = await listUserWorkspaces(ctx.user.id);
  const workspaces = memberships.map((m) => ({ id: m.workspaceId, name: m.workspace.name }));
  const locale = isLocale(ctx.locale) ? ctx.locale : 'fr';

  return (
    <I18nProvider locale={locale}>
      <WorkspaceProvider
        value={{
          workspaceId: ctx.workspaceId,
          workspaceName: ctx.workspaceName,
          isDemo: ctx.isDemo,
          role: ctx.role,
          userId: ctx.user.id,
          userName: ctx.user.name,
          userEmail: ctx.user.email,
        }}
      >
        <TooltipProvider delayDuration={200}>
          <div className="flex min-h-screen">
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r bg-card lg:block">
              <SidebarNav />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
              <Topbar workspaces={workspaces} />
              <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-8">{children}</main>
            </div>
          </div>
          <MobileNav />
        </TooltipProvider>
      </WorkspaceProvider>
    </I18nProvider>
  );
}
