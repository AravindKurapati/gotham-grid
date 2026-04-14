import { anthropic } from './anthropic';
import type { DeepScanData } from './types';

function sanitize(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u2013\u2014]/g, '--').trim();
}

export async function deepScanProject(url: string, title: string): Promise<DeepScanData> {
  const prompt = `Search for detailed information about this project: "${title}" at ${url}.
Find: GitHub stars (if applicable), tech stack used, last updated date, and a 2-3 sentence technical summary.
Also assign a "vibe score" from 1-10 based on creativity, polish, and cultural relevance.

Return ONLY a JSON object with no markdown:
{
  "githubStars": 0,
  "techStack": ["React", "D3"],
  "lastUpdated": "2025-01-15",
  "summary": "...",
  "vibeScore": 7
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }] as any,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlocks = response.content.filter(b => b.type === 'text') as Array<{ type: 'text'; text: string }>;
  const text = textBlocks.map(b => b.text).join('\n');

  let json = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = json.indexOf('{');
  const end = json.lastIndexOf('}');
  if (start === -1 || end === -1) return {};
  json = json.slice(start, end + 1);

  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    return {
      githubStars: typeof raw.githubStars === 'number' ? raw.githubStars : undefined,
      techStack: Array.isArray(raw.techStack) ? raw.techStack.map(String) : undefined,
      lastUpdated: sanitize(raw.lastUpdated),
      summary: sanitize(raw.summary),
      vibeScore: typeof raw.vibeScore === 'number' ? Math.min(10, Math.max(1, raw.vibeScore)) : undefined,
    };
  } catch {
    return {};
  }
}
