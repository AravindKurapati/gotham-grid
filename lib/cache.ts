export class Cache<T = unknown> {
  private store = new Map<string, { value: T; expires: number }>();
  private ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expires: Date.now() + this.ttl });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

/** Shared 30-minute cache for live scan results */
export const liveCache = new Cache<unknown>(30 * 60 * 1000);
