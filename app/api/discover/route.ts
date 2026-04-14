import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limit';
import { liveCache } from '@/lib/cache';
import { discoverProjects } from '@/lib/discover';
import { CITIES } from '@/lib/cities';
import type { DiscoverRequest, DiscoverResponse } from '@/lib/types';

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  // Rate limit
  const rl = rateLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json('RATE LIMIT -- COOL DOWN 60s', { status: 429 });
  }

  let body: DiscoverRequest;
  try {
    body = (await req.json()) as DiscoverRequest;
  } catch {
    return NextResponse.json('INVALID REQUEST', { status: 400 });
  }

  const { city, category, query, scanCode } = body;
  if (!city || !CITIES[city]) {
    return NextResponse.json('UNKNOWN CITY', { status: 400 });
  }

  // Invite code check -- only reject if SCAN_CODE is set AND a code was provided AND it doesn't match
  const requiredCode = process.env.SCAN_CODE;
  if (requiredCode && scanCode && scanCode !== requiredCode) {
    return NextResponse.json('ACCESS DENIED -- INVALID SCAN CODE', { status: 403 });
  }

  // Cache check
  const cacheKey = `live:${city}:${category ?? 'all'}:${query ?? 'default'}`;
  const cached = liveCache.get(cacheKey) as DiscoverResponse['projects'] | null;
  if (cached) {
    const response: DiscoverResponse = {
      projects: cached,
      meta: { city, total: cached.length, cached: true, source: 'live', timestamp: new Date().toISOString() },
    };
    return NextResponse.json(response);
  }

  // Discover
  try {
    const projects = await discoverProjects(CITIES[city], { category, query });
    liveCache.set(cacheKey, projects);
    const response: DiscoverResponse = {
      projects,
      meta: { city, total: projects.length, cached: false, source: 'live', timestamp: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error('[discover] error:', err);
    return NextResponse.json('SIGNAL LOST -- SCANNER MALFUNCTION', { status: 500 });
  }
}
