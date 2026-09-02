import { AtSign } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { redactConfig } from '@/lib/crypto';
import { PageHeader } from '@/components/ui/page-header';
import { EmailAccountsView } from '@/components/email-accounts/email-accounts-view';

export const metadata = { title: 'Comptes Email' };
export const dynamic = 'force-dynamic';

export default async function EmailAccountsPage() {
  const ctx = await requireWorkspace('email_accounts:read');
  const accounts = await prisma.emailAccount.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: 'asc' },
    include: { domain: true, _count: { select: { campaigns: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Comptes Email"
        description="Les expéditeurs utilisés par vos campagnes. Chaque compte a ses propres limites et sa propre réputation."
      />
      <EmailAccountsView
        accounts={accounts.map((a) => ({
          id: a.id,
          label: a.label,
          provider: a.provider,
          fromEmail: a.fromEmail,
          fromName: a.fromName,
          replyTo: a.replyTo,
          status: a.status,
          statusMessage: a.statusMessage,
          dailyLimit: a.dailyLimit,
          hourlyLimit: a.hourlyLimit,
          warmupEnabled: a.warmupEnabled,
          warmupStartLimit: a.warmupStartLimit,
          warmupIncrement: a.warmupIncrement,
          warmupStartAt: a.warmupStartAt?.toISOString() ?? null,
          sentToday: a.sentTodayDate && a.sentTodayDate >= today ? a.sentToday : 0,
          sentTotal: a.sentTotal,
          bounceCount: a.bounceCount,
          lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
          active: a.active,
          campaignCount: a._count.campaigns,
          domain: a.domain ? { id: a.domain.id, domain: a.domain.domain, spf: a.domain.spf, dkim: a.domain.dkim, dmarc: a.domain.dmarc } : null,
          credentials: redactConfig(a.credentials as Record<string, unknown>),
        }))}
        canWrite={can(ctx.role, 'email_accounts:write')}
      />
    </div>
  );
}
