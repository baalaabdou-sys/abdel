import 'server-only';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * In-process fixed-window rate limiter. Sufficient for a single Node instance.
 * For multi-instance deployments set REDIS_URL and swap this for a shared store
 * (see README → Production considerations).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}
