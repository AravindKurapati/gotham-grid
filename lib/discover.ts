import { anthropic } from './anthropic';
import type { Project, CityKey, Category } from './types';

const VALID_CATEGORIES = new Set(['TRANSIT', 'FOOD', 'SUNSET', 'MAPS', 'UTILITY', 'AI', 'ART', 'OTHER']);
const VALID_SOURCES = new Set(['twitter', 'github', 'reddit', 'hackernews', 'blog', 'producthunt', 'other']);

function sanitizeText(s: unknown): string {
  if (typeof s !== 'string') return '';
  // Replace em dash (U+2014) and en dash (U+2013) with double-hyphen
  return s.replace(/[\u2013\u2014]/g, '--').trim();
}

function parseProjects(text: string, city: CityKey): Project[] {
  let json = text.trim();
  // Strip markdown code fences if present
  json = json.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  // Find the JSON array bounds
  const start = json.indexOf('[');
  const end = json.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  json = json.slice(start, end + 1);

  try {
    const raw: unknown[] = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const obj = item as Record<string, unknown>;
        return {
          id: crypto.randomUUID(),
          title: sanitizeText(obj.title),
          author: sanitizeText(obj.author),
          description: sanitizeText(obj.description),
          category: VALID_CATEGORIES.has(String(obj.category))
            ? (String(obj.category) as Category)
            : 'OTHER',
          url: typeof obj.url === 'string' ? obj.url : '',
          source: VALID_SOURCES.has(String(obj.source))
            ? (String(obj.source) as Project['source'])
            : 'other',
          date: sanitizeText(obj.date),
          likes: typeof obj.likes === 'number' ? obj.likes : undefined,
          city,
        } satisfies Project;
      })
      .filter(p => p.title.length > 0);
  } catch {
    return [];
  }
}

const SYSTEM_PROMPT = `You are GOTHAM GRID scanner. Search the web for creative coding projects, apps, visualizations, and tech demos themed around a specific city.

Focus on:
- Vibe-coded apps and demos shared on Twitter/X in 2024-2026
- GitHub repos with city-themed creative projects
- Reddit and Hacker News posts about city-specific apps
- Blog posts and Product Hunt launches
- Deployed web apps and interactive demos

Categories: TRANSIT, FOOD, SUNSET, MAPS, UTILITY, AI, ART, OTHER.

Return ONLY a valid JSON array. No markdown, no backticks, no preamble.
Each object must have these fields:
{
  "title": "Project Name",
  "author": "@handle or Name",
  "description": "1-2 sentence description",
  "category": "TRANSIT|FOOD|SUNSET|MAPS|UTILITY|AI|ART|OTHER",
  "url": "https://...",
  "source": "twitter|github|reddit|hackernews|blog|producthunt|other",
  "date": "relative or ISO date",
  "likes": 0
}

Return 8-15 unique, REAL projects that actually exist. Do not invent fake ones.`;

export async function discoverProjects(
  city: { key: CityKey; displayName: string; searchTerms: string[] },
  options: { category?: Category; query?: string } = {}
): Promise<Project[]> {
  const terms = city.searchTerms.join(', ');
  const catFilter = options.category ? ` Focus on category: ${options.category}.` : '';
  const queryFilter = options.query ? ` User search: "${options.query}".` : '';

  const userPrompt = `Search for vibe-coded and creative tech projects from ${city.displayName} (search terms: ${terms}).${catFilter}${queryFilter}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }] as any,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlocks = response.content.filter(b => b.type === 'text') as Array<{ type: 'text'; text: string }>;
  const text = textBlocks.map(b => b.text).join('\n');

  return parseProjects(text, city.key);
}
