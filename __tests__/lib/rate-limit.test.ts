import { RateLimiter } from '@/lib/rate-limit';

describe('RateLimiter', () => {
  it('allows requests below the limit', () => {
    const limiter = new RateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('1.2.3.4').allowed).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    const limiter = new RateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) limiter.check('1.2.3.4');
    const result = limiter.check('1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks different IPs independently', () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.check('1.1.1.1');
    expect(limiter.check('1.1.1.1').allowed).toBe(false);
    expect(limiter.check('2.2.2.2').allowed).toBe(true);
  });

  it('remaining decrements with each request', () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.check('ip').remaining).toBe(2);
    expect(limiter.check('ip').remaining).toBe(1);
    expect(limiter.check('ip').remaining).toBe(0);
  });

  it('old timestamps outside the window do not count', async () => {
    const limiter = new RateLimiter(2, 50);
    limiter.check('ip');
    limiter.check('ip');
    await new Promise(r => setTimeout(r, 80));
    expect(limiter.check('ip').allowed).toBe(true);
  });
});
