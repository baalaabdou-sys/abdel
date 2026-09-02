'use server';
import { revalidatePath } from 'next/cache';
import { requireAuth, guard, ok, type ActionResult } from '../context';
import { markAllRead, markRead } from '../services/notifications';

export async function markNotificationReadAction(id: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireAuth();
    await markRead(ctx.workspaceId, id, ctx.user.id);
    return ok(null);
  });
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireAuth();
    await markAllRead(ctx.workspaceId, ctx.user.id);
    revalidatePath('/dashboard');
    return ok(null);
  });
}
