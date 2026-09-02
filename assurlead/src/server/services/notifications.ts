import 'server-only';
import type { NotificationLevel } from '@prisma/client';
import { prisma } from '@/lib/db';
import { enqueue } from './queue';

export type NotifyInput = {
  workspaceId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  level?: NotificationLevel;
  /** Target a single user; omit to notify the whole workspace feed. */
  userId?: string | null;
  /** Roles to fan out to when no userId is given. */
  roles?: ('OWNER' | 'ADMIN' | 'MARKETING' | 'SALES' | 'VIEWER')[];
  dedupeKey?: string;
  /** Also send an email notification through the workspace's account. */
  email?: boolean;
};

/**
 * In-app notifications with optional email fan-out.
 * SMS / Slack / WhatsApp adapters plug in at `deliverExternal` — see README.
 */
export async function notify(input: NotifyInput) {
  const level = input.level ?? 'INFO';
  const targets: (string | null)[] = [];

  if (input.userId) {
    targets.push(input.userId);
  } else if (input.roles?.length) {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: input.workspaceId, role: { in: input.roles } },
      select: { userId: true },
    });
    targets.push(...members.map((m) => m.userId));
  } else {
    targets.push(null); // workspace-wide entry
  }

  const created: string[] = [];
  for (const userId of targets) {
    try {
      const n = await prisma.notification.create({
        data: {
          workspaceId: input.workspaceId,
          userId,
          level,
          type: input.type,
          title: input.title,
          body: input.body ?? '',
          link: input.link ?? null,
          dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${userId ?? 'ws'}` : null,
        },
      });
      created.push(n.id);
      if (input.email && userId) {
        await enqueue('notification.email', { notificationId: n.id }, { workspaceId: input.workspaceId, dedupeKey: `notif-email:${n.id}` });
      }
    } catch (err) {
      // Duplicate dedupeKey — the notification already exists.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }
  return created;
}

export async function markRead(workspaceId: string, notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, workspaceId, OR: [{ userId }, { userId: null }] },
    data: { read: true },
  });
}

export async function markAllRead(workspaceId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { workspaceId, read: false, OR: [{ userId }, { userId: null }] },
    data: { read: true },
  });
}
