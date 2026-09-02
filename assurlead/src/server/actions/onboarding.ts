'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, type ActionResult } from '../context';

export async function setOnboardingStepAction(step: number): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('settings:write');
    await prisma.workspace.update({
      where: { id: ctx.workspaceId },
      data: { onboardingStep: Math.max(0, Math.min(10, step)) },
    });
    return ok(null);
  });
}

export async function completeOnboardingAction(): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('settings:write');
    await prisma.workspace.update({
      where: { id: ctx.workspaceId },
      data: { onboardingDone: true, onboardingStep: 10 },
    });
    revalidatePath('/dashboard');
    return ok(null);
  });
}
