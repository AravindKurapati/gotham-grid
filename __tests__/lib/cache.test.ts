import { Cache } from '@/lib/cache';

describe('Cache', () => {
  it('returns null for a key that was never set', () => {
    const cache = new Cache(1000);
    expect(cache.get('missing')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    const cache = new Cache(1000);
    cache.set('key', { data: 42 });
    expect(cache.get('key')).toEqual({ data: 42 });
  });

  it('returns null after TTL expires', async () => {
    const cache = new Cache(50);
    cache.set('key', 'value');
    await new Promise(r => setTimeout(r, 80));
    expect(cache.get('key')).toBeNull();
  });

  it('overwriting a key resets its TTL', async () => {
    const cache = new Cache(80);
    cache.set('key', 'first');
    await new Promise(r => setTimeout(r, 50));
    cache.set('key', 'second');
    await new Promise(r => setTimeout(r, 50));
    expect(cache.get('key')).toBe('second');
  });

  it('delete removes the key', () => {
    const cache = new Cache(1000);
    cache.set('k', 1);
    cache.delete('k');
    expect(cache.get('k')).toBeNull();
  });
});
