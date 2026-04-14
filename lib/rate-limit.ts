interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export class RateLimiter {
  private store = new Map<string, number[]>();
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(ip: string): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.store.get(ip) ?? []).filter(t => t > cutoff);

    if (timestamps.length >= this.limit) {
      const oldest = timestamps[0];
      return { allowed: false, remaining: 0, resetIn: this.windowMs - (now - oldest) };
    }

    timestamps.push(now);
    this.store.set(ip, timestamps);
    return { allowed: true, remaining: this.limit - timestamps.length, resetIn: this.windowMs };
  }
}

/** Shared rate limiter: 5 requests per minute per IP */
export const rateLimiter = new RateLimiter(5, 60_000);
