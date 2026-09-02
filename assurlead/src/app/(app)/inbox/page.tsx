import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { InboxView } from '@/components/inbox/inbox-view';
import { REPLY_CATEGORY_LIST, replyCategoryLabel } from '@/lib/domain';

export const metadata = { title: 'Inbox' };
export const dynamic = 'force-dynamic';

export default async function InboxPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const ctx = await requireWorkspace('inbox:read');
  const filter = searchParams.category;

  const [threads, counts] = await Promise.all([
    prisma.emailThread.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        archived: searchParams.archived === '1',
        ...(filter && filter !== 'all' ? { category: filter as 'OTHER' } : {}),
        ...(searchParams.unread === '1' ? { unread: true } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        lead: { select: { id: true, score: true, product: true } },
        campaign: { select: { id: true, name: true } },
      },
    }),
    prisma.emailThread.groupBy({
      by: ['category'],
      where: { workspaceId: ctx.workspaceId, archived: false },
      _count: { _all: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inbox"
        description="Réponses reçues à vos campagnes, classées automatiquement. Aucune réponse n’est envoyée sans votre validation."
      />
      <InboxView
        threads={threads.map((t) => ({
          id: t.id, subject: t.subject, category: t.category, unread: t.unread, archived: t.archived,
          lastMessageAt: t.lastMessageAt.toISOString(),
          participants: t.participants,
          leadId: t.lead?.id ?? null, leadScore: t.lead?.score ?? null,
          campaignName: t.campaign?.name ?? null,
          messages: t.messages.map((m) => ({
            id: m.id, direction: m.direction, fromEmail: m.fromEmail, toEmail: m.toEmail,
            subject: m.subject, bodyText: m.bodyText, aiSuggestion: m.aiSuggestion,
            aiReasoning: m.aiReasoning, createdAt: m.createdAt.toISOString(),
          })),
        }))}
        categories={REPLY_CATEGORY_LIST.map((c) => ({
          value: c,
          label: replyCategoryLabel(c),
          count: counts.find((x) => x.category === c)?._count._all ?? 0,
        }))}
        canWrite={can(ctx.role, 'inbox:write')}
      />
    </div>
  );
}
