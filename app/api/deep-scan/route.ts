import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limit';
import { deepScanProject } from '@/lib/deep-scan';

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  const rl = rateLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json('RATE LIMIT -- COOL DOWN 60s', { status: 429 });
  }

  let body: { url: string; title: string; scanCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json('INVALID REQUEST', { status: 400 });
  }

  const { url, title, scanCode } = body;
  if (!url || !title) {
    return NextResponse.json('MISSING URL OR TITLE', { status: 400 });
  }

  const requiredCode = process.env.SCAN_CODE;
  if (requiredCode && scanCode && scanCode !== requiredCode) {
    return NextResponse.json('ACCESS DENIED -- INVALID SCAN CODE', { status: 403 });
  }

  try {
    const data = await deepScanProject(url, title);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[deep-scan] error:', err);
    return NextResponse.json('SIGNAL LOST -- SCANNER MALFUNCTION', { status: 500 });
  }
}
