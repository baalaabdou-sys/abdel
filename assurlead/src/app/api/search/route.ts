import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceContext } from '@/lib/auth';
import { can } from '@/lib/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Workspace-scoped global search. Every branch filters on workspaceId. */
export async function GET(request: Request) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return NextResponse.json({ results: [] }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const ws = ctx.workspaceId;
  const results: { id: string; type: string; title: string; subtitle: string; href: string }[] = [];

  const [contacts, campaigns, leads, segments, pages, tasks] = await Promise.all([
    can(ctx.role, 'contacts:read')
      ? prisma.contact.findMany({
          where: {
            workspaceId: ws,
            OR: [
              { emailNormalized: { contains: q.toLowerCase() } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          },
          take: 5,
          select: { id: true, email: true, firstName: true, lastName: true, city: true },
        })
      : [],
    can(ctx.role, 'campaigns:read')
      ? prisma.campaign.findMany({
          where: { workspaceId: ws, name: { contains: q, mode: 'insensitive' } },
          take: 4, select: { id: true, name: true, product: true, status: true },
        })
      : [],
    can(ctx.role, 'leads:read')
      ? prisma.lead.findMany({
          where: {
            workspaceId: ws,
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          },
          take: 4, select: { id: true, firstName: true, lastName: true, email: true, product: true, score: true },
        })
      : [],
    can(ctx.role, 'segments:read')
      ? prisma.segment.findMany({
          where: { workspaceId: ws, name: { contains: q, mode: 'insensitive' } },
          take: 3, select: { id: true, name: true, cachedCount: true },
        })
      : [],
    can(ctx.role, 'landing:read')
      ? prisma.landingPage.findMany({
          where: { workspaceId: ws, name: { contains: q, mode: 'insensitive' } },
          take: 3, select: { id: true, name: true, slug: true, status: true },
        })
      : [],
    can(ctx.role, 'tasks:read')
      ? prisma.task.findMany({
          where: { workspaceId: ws, title: { contains: q, mode: 'insensitive' } },
          take: 3, select: { id: true, title: true, status: true },
        })
      : [],
  ]);

  for (const c of contacts) {
    results.push({
      id: c.id, type: 'contact',
      title: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email,
      subtitle: [c.email, c.city].filter(Boolean).join(' · '),
      href: `/contacts/${c.id}`,
    });
  }
  for (const c of campaigns) results.push({ id: c.id, type: 'campaign', title: c.name, subtitle: `${c.product} · ${c.status}`, href: `/campaigns/${c.id}` });
  for (const l of leads) {
    results.push({
      id: l.id, type: 'lead',
      title: [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email || 'Lead',
      subtitle: `${l.product} · score ${l.score}/100`,
      href: `/leads/${l.id}`,
    });
  }
  for (const s of segments) results.push({ id: s.id, type: 'segment', title: s.name, subtitle: `${s.cachedCount} contacts`, href: `/segments/${s.id}` });
  for (const p of pages) results.push({ id: p.id, type: 'landing', title: p.name, subtitle: `/${p.slug} · ${p.status}`, href: `/landing-pages/${p.id}` });
  for (const t of tasks) results.push({ id: t.id, type: 'task', title: t.title, subtitle: t.status, href: `/tasks` });

  return NextResponse.json({ results });
}
