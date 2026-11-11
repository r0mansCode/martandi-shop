import "server-only";

// Fixed-window limiter kept in memory. On serverless each instance has its own memory, so this
// only slows down a single client hammering one instance; it is a speed bump, not a guarantee.

const hits = new Map<string, { count: number; resetAt: number }>();

/** Returns false when `key` has used up `limit` calls in the current window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Drop expired entries now and then so the map can't grow without bound.
  if (hits.size > 1000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }

  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
