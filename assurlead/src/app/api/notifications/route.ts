import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceContext } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return NextResponse.json({ notifications: [], unread: 0 }, { status: 401 });

  const where = { workspaceId: ctx.workspaceId, OR: [{ userId: ctx.user.id }, { userId: null }] };
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 25,
      select: { id: true, title: true, body: true, link: true, level: true, read: true, createdAt: true },
    }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);

  return NextResponse.json({ notifications, unread });
}
