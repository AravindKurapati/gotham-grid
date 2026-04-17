import * as dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import { CITIES, CITY_KEYS } from '../lib/cities';
import type { Project, CityKey, Category, CityConfig } from '../lib/types';

dotenv.config({ path: '.env.local' });

if (!process.env.GROQ_API_KEY) {
  console.error('[ERR] GROQ_API_KEY not set. Add it to .env.local');
  process.exit(1);
}
if (!process.env.TAVILY_API_KEY) {
  console.error('[ERR] TAVILY_API_KEY not set. Add it to .env.local');
  process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

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

function buildQueries(city: CityConfig): string[] {
  const name = city.name;
  return [
    `${name} data visualization project 2024 2025`,
    `${name} interactive map app site:github.com OR site:twitter.com`,
    `"I built" "${name}" app twitter OR reddit`,
    `${name} open data creative coding project`,
    `${name} side project launched vibe coding`,
    ...city.searchTerms.slice(0, 3).map(t => `${t} creative tech project`),
  ];
}

async function tavilySearch(queries: string[]): Promise<string> {
  const seen = new Set<string>();
  const chunks: string[] = [];

  for (const q of queries) {
    try {
      const res = await tavilyClient.search(q, { maxResults: 5 });
      for (const r of res.results) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          chunks.push(`[${chunks.length + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`);
        }
      }
    } catch {
      // skip failed query
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return chunks.join('\n\n');
}

async function scanCity(cityKey: CityKey): Promise<Project[]> {
  const city = CITIES[cityKey];
  const queries = buildQueries(city);
  const searchText = await tavilySearch(queries);

  if (!searchText.trim()) return [];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2048,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Search results for creative tech projects from ${city.displayName}:\n\n${searchText}\n\nExtract 8-15 unique projects as a JSON array.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';
  return parseProjects(text, cityKey);
}

function pad(s: string, len: number): string {
  return s.padEnd(len, '.');
}

async function main() {
  const argCities = process.argv.slice(2).filter(a => a in CITIES) as CityKey[];
  const citiesToScan: CityKey[] = argCities.length > 0 ? argCities : CITY_KEYS;

  console.log('\n[GOTHAM GRID SCANNER] — Tavily + Groq llama-3.3-70b-versatile');
  console.log('='.repeat(50));
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });

  let total = 0;
  for (const cityKey of citiesToScan) {
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
      const outPath = join(process.cwd(), 'data', `${cityKey}.json`);
      writeFileSync(outPath, '[]', 'utf-8');
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('='.repeat(50));
  console.log(`[DONE] ${total} total projects across ${citiesToScan.length} cities`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
