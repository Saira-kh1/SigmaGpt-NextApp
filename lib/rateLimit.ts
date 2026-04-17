/** Simple in-memory IP-based rate limiter for API routes. */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/** Prune old entries every 5 min to avoid memory leaks in long-running servers. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (now > bucket.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Returns true if the request exceeds the limit.
 * @param key      Unique key (e.g. "guest:192.168.1.1")
 * @param max      Max requests per window
 * @param windowMs Window size in ms
 */
export function isRateLimited(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + windowMs };
    store.set(key, bucket);
    return false;
  }

  bucket.count += 1;
  return bucket.count > max;
}
