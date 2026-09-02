import 'server-only';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Durable job queue backed by PostgreSQL (`SELECT … FOR UPDATE SKIP LOCKED`).
 *
 * Why not BullMQ/Redis: the sending pipeline must never lose or duplicate a job,
 * and every business fact it touches already lives in Postgres. Keeping jobs in
 * the same database makes claim + state transition transactional with the
 * recipient row, which removes the "sent but not recorded" window a separate
 * broker introduces. Redis remains available for caching/rate limiting.
 * A BullMQ driver can be added behind this same API — see README.
 */

export type JobType =
  | 'campaign.dispatch'
  | 'campaign.send_recipient'
  | 'contacts.verify_batch'
  | 'contacts.import'
  | 'segment.refresh'
  | 'automation.speed_to_lead'
  | 'notification.email'
  | 'deliverability.check_domain'
  | 'goal.rollup';

export type EnqueueOptions = {
  workspaceId?: string | null;
  queue?: string;
  runAt?: Date;
  maxAttempts?: number;
  /** Unique key — a second enqueue with the same key is ignored. */
  dedupeKey?: string;
};

export async function enqueue(type: JobType, payload: Record<string, unknown>, options: EnqueueOptions = {}) {
  const data: Prisma.JobCreateInput = {
    type,
    payload: payload as Prisma.InputJsonValue,
    queue: options.queue ?? 'default',
    runAt: options.runAt ?? new Date(),
    maxAttempts: options.maxAttempts ?? 5,
    dedupeKey: options.dedupeKey ?? null,
    ...(options.workspaceId ? { workspace: { connect: { id: options.workspaceId } } } : {}),
  };
  try {
    return await prisma.job.create({ data });
  } catch (err) {
    // Unique violation on dedupeKey — the job already exists, which is the point.
    if ((err as { code?: string }).code === 'P2002') return null;
    throw err;
  }
}

export type ClaimedJob = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  workspaceId: string | null;
};

/** Atomically claims up to `limit` due jobs for this worker. */
export async function claimJobs(workerId: string, limit = 5, queue = 'default'): Promise<ClaimedJob[]> {
  const rows = await prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "Job" AS j
    SET status = 'PROCESSING',
        "lockedAt" = NOW(),
        "lockedBy" = ${workerId},
        attempts = j.attempts + 1,
        "updatedAt" = NOW()
    FROM (
      SELECT id FROM "Job"
      WHERE status = 'PENDING' AND "runAt" <= NOW() AND queue = ${queue}
      ORDER BY "runAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    ) AS due
    WHERE j.id = due.id
    RETURNING j.id, j.type, j.payload, j.attempts, j."maxAttempts", j."workspaceId";
  `;
  return rows;
}

export async function completeJob(id: string) {
  await prisma.job.update({ where: { id }, data: { status: 'DONE', finishedAt: new Date(), lastError: null } });
}

/** Fails a job, retrying with exponential backoff until maxAttempts is reached. */
export async function failJob(id: string, error: string, attempts: number, maxAttempts: number) {
  if (attempts >= maxAttempts) {
    await prisma.job.update({
      where: { id },
      data: { status: 'FAILED', lastError: error.slice(0, 1000), finishedAt: new Date() },
    });
    return;
  }
  const backoffMs = Math.min(2 ** attempts * 5_000, 10 * 60_000);
  await prisma.job.update({
    where: { id },
    data: { status: 'PENDING', lastError: error.slice(0, 1000), runAt: new Date(Date.now() + backoffMs), lockedAt: null, lockedBy: null },
  });
}

/** Releases jobs whose worker died mid-flight. */
export async function reclaimStaleJobs(olderThanMs = 5 * 60_000) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const { count } = await prisma.job.updateMany({
    where: { status: 'PROCESSING', lockedAt: { lt: cutoff } },
    data: { status: 'PENDING', lockedAt: null, lockedBy: null },
  });
  return count;
}

export function newWorkerId() {
  return `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
}
