interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT = 10; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute

export function checkRateLimit(ip: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return { success: true, remaining: RATE_LIMIT - 1 };
  }

  if (entry.count >= RATE_LIMIT) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: RATE_LIMIT - entry.count };
}

export function getRateLimitHeaders(ip: string) {
  const entry = rateLimitMap.get(ip);
  const remaining = entry ? Math.max(0, RATE_LIMIT - entry.count) : RATE_LIMIT;
  const resetTime = entry ? Math.ceil(entry.resetTime / 1000) : Math.ceil((Date.now() + WINDOW_MS) / 1000);

  return {
    'X-RateLimit-Limit': RATE_LIMIT.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString()
  };
}
