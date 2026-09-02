/**
 * Background worker.
 *
 * Run alongside the web process: `npm run worker`.
 * Multiple workers can run concurrently — job claiming uses
 * `FOR UPDATE SKIP LOCKED`, so no job is ever processed twice at the same time.
 */
import { claimJobs, completeJob, failJob, newWorkerId, reclaimStaleJobs } from '@/server/services/queue';
import { handlers } from './handlers';
import { prisma } from '@/lib/db';

const WORKER_ID = newWorkerId();
const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
const BATCH = Number(process.env.WORKER_BATCH ?? 10);

let running = true;

async function tick() {
  const jobs = await claimJobs(WORKER_ID, BATCH);
  if (jobs.length === 0) return 0;

  for (const job of jobs) {
    const handler = handlers[job.type];
    if (!handler) {
      await failJob(job.id, `Aucun handler pour le type "${job.type}"`, job.maxAttempts, job.maxAttempts);
      continue;
    }
    try {
      await handler(job);
      await completeJob(job.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[worker] job ${job.type} (${job.id}) failed:`, message);
      await failJob(job.id, message, job.attempts, job.maxAttempts);
    }
  }
  return jobs.length;
}

async function main() {
  console.log(`[worker] ${WORKER_ID} started — polling every ${POLL_MS}ms`);
  let sinceReclaim = 0;

  while (running) {
    try {
      const processed = await tick();
      sinceReclaim += 1;
      if (sinceReclaim >= 60) {
        const reclaimed = await reclaimStaleJobs();
        if (reclaimed) console.log(`[worker] reclaimed ${reclaimed} stale job(s)`);
        sinceReclaim = 0;
      }
      if (processed === 0) await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (err) {
      console.error('[worker] tick failed:', err);
      await new Promise((r) => setTimeout(r, POLL_MS * 2));
    }
  }
  await prisma.$disconnect();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[worker] ${signal} received — draining`);
    running = false;
    setTimeout(() => process.exit(0), 3000);
  });
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
