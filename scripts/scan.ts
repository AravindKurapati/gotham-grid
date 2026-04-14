import * as dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { CITIES, CITY_KEYS } from '../lib/cities';
import type { Project, CityKey, Category } from '../lib/types';

dotenv.config({ path: '.env.local' });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ERR] ANTHROPIC_API_KEY not set. Add it to .env.local');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
Each object:
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

async function scanCity(cityKey: CityKey): Promise<Project[]> {
  const city = CITIES[cityKey];
  const terms = city.searchTerms.join(', ');
  const userPrompt = `Search for vibe-coded and creative tech projects from ${city.displayName} (search terms: ${terms}).`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }] as any,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlocks = response.content.filter(b => b.type === 'text') as Array<{ type: 'text'; text: string }>;
  const text = textBlocks.map(b => b.text).join('\n');

  return parseProjects(text, cityKey);
}

function pad(s: string, len: number): string {
  return s.padEnd(len, '.');
}

async function main() {
  console.log('\n[GOTHAM GRID SCANNER]');
  console.log('='.repeat(50));
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });

  let total = 0;
  for (const cityKey of CITY_KEYS) {
    const city = CITIES[cityKey];
    process.stdout.write(`> SCANNING ${pad(city.displayName, 22)} `);
    try {
      const projects = await scanCity(cityKey);
      const outPath = join(process.cwd(), 'data', `${cityKey}.json`);
      writeFileSync(outPath, JSON.stringify(projects, null, 2), 'utf-8');
      total += projects.length;
      console.log(`${projects.length} projects`);
    } catch (err) {
      console.log(`ERR: ${err instanceof Error ? err.message : String(err)}`);
      // Write empty array so the app still loads
      const outPath = join(process.cwd(), 'data', `${cityKey}.json`);
      writeFileSync(outPath, '[]', 'utf-8');
    }
    // Brief pause between cities to avoid rate limits
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log('='.repeat(50));
  console.log(`[DONE] ${total} total projects across ${CITY_KEYS.length} cities`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
