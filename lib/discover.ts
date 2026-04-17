import Groq from 'groq-sdk';
import { searchMany } from './tavily';
import type { Project, CityKey, Category } from './types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

const VALID_CATEGORIES = new Set(['TRANSIT', 'FOOD', 'SUNSET', 'MAPS', 'UTILITY', 'AI', 'ART', 'OTHER']);
const VALID_SOURCES = new Set(['twitter', 'github', 'reddit', 'hackernews', 'blog', 'producthunt', 'other']);

function sanitizeText(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u2013\u2014]/g, '--').trim();
}

function parseProjects(text: string, city: CityKey): Project[] {
  let json = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
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
          sourceUrl: typeof obj.sourceUrl === 'string' && obj.sourceUrl ? obj.sourceUrl : undefined,
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

const SYSTEM_PROMPT = `You are GOTHAM GRID scanner. You will be given raw web search results about creative coding projects from a specific city.

Extract and return ONLY a valid JSON array of projects found in the search results. No markdown, no backticks, no preamble.
Each object:
{
  "title": "Project Name",
  "author": "@handle or Name",
  "description": "1-2 sentence description",
  "category": "TRANSIT|FOOD|SUNSET|MAPS|UTILITY|AI|ART|OTHER",
  "url": "https://... (the actual project or demo URL)",
  "sourceUrl": "https://... (the tweet/post/repo URL where it was found -- omit if same as url)",
  "source": "twitter|github|reddit|hackernews|blog|producthunt|other",
  "date": "relative or ISO date",
  "likes": 0
}

Only include REAL projects from the search results. Do not invent anything.`;

export async function discoverProjects(
  city: { key: CityKey; displayName: string; searchTerms: string[] },
  options: { category?: Category; query?: string } = {}
): Promise<Project[]> {
  const name = city.displayName;
  const catFilter = options.category ? ` category:${options.category}` : '';
  const qFilter = options.query ? ` "${options.query}"` : '';

  const queries = [
    `${name} data visualization project 2024 2025${qFilter}`,
    `${name} interactive map app site:github.com OR site:twitter.com`,
    `"I built" "${name}" app${catFilter}`,
    `${name} open data creative coding project`,
    `${name} side project launched vibe coding${qFilter}`,
  ];

  const searchText = await searchMany(queries, 5);

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Search results for creative tech projects from ${name}:\n\n${searchText}\n\nExtract 8-15 unique projects as a JSON array.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';
  return parseProjects(text, city.key);
}
