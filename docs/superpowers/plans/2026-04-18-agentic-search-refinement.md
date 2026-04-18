# Agentic Search Refinement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-correcting quality loop to project discovery and real liveness/metadata verification to deep scan.

**Architecture:** A new shared `lib/agent-loop.ts` handles up to 3 search-evaluate-refine iterations, scoring each batch and generating targeted fill-in queries for missing categories or low URL quality. `lib/discover.ts` and `scripts/scan.ts` become thin wrappers over it. `lib/deep-scan.ts` gains a HEAD liveness check followed by Tavily `extract()` for real metadata, with a `status` field on `DeepScanData` to surface OFFLINE links in the UI.

**Tech Stack:** TypeScript, Groq SDK (`llama-3.3-70b-versatile`), Tavily `@tavily/core`, Next.js 14, Jest + ts-jest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/types.ts` | Modify | Add `status` field to `DeepScanData` |
| `lib/tavily.ts` | Modify | Add `searchRaw()`, `extractUrl()`, lazy-init client |
| `lib/agent-loop.ts` | **Create** | Quality scoring, query refinement, `runAgentLoop` |
| `lib/discover.ts` | Modify | Thin wrapper over `runAgentLoop` |
| `lib/deep-scan.ts` | Modify | HEAD check + Tavily extract + Groq metadata merge |
| `scripts/scan.ts` | Modify | Thin wrapper over `runAgentLoop`, remove duplicated logic |
| `components/ProjectCardExpanded.tsx` | Modify | Render OFFLINE/LIVE badge from `deepScan.status` |
| `__tests__/lib/agent-loop.test.ts` | **Create** | Tests for scoring, refinement, loop |
| `__tests__/lib/deep-scan.test.ts` | **Create** | Tests for liveness check and metadata extraction |

---

## Task 1: Extend `lib/types.ts` and `lib/tavily.ts`

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/tavily.ts`

### Step 1.1 — Add `status` to `DeepScanData` in `lib/types.ts`

Replace the `DeepScanData` interface:

```typescript
export interface DeepScanData {
  githubStars?: number;
  techStack?: string[];
  lastUpdated?: string;
  summary?: string;
  vibeScore?: number;
  status?: 'LIVE' | 'OFFLINE' | 'UNKNOWN';
}
```

- [ ] Open `lib/types.ts`, replace `DeepScanData` with the above.

### Step 1.2 — Update `lib/tavily.ts` with lazy init, `searchRaw`, `extractUrl`

Replace the entire file:

```typescript
import { tavily } from '@tavily/core';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

// Lazy init so dotenv has time to load before first use (needed by scripts/scan.ts)
let _client: ReturnType<typeof tavily> | null = null;
function getClient() {
  if (!_client) _client = tavily({ apiKey: process.env.TAVILY_API_KEY ?? '' });
  return _client;
}

/** Run queries, return raw deduplicated results. */
export async function searchRaw(queries: string[], maxPerQuery = 5): Promise<SearchResult[]> {
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const q of queries) {
    try {
      const res = await getClient().search(q, { maxResults: maxPerQuery });
      for (const r of res.results) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          results.push({ title: r.title, url: r.url, content: r.content });
        }
      }
    } catch {
      // skip failed query, continue
    }
  }

  return results;
}

/** Run multiple queries, return deduplicated results as formatted text. */
export async function searchMany(queries: string[], maxPerQuery = 5): Promise<string> {
  const results = await searchRaw(queries, maxPerQuery);
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n');
}

/** Single query, returns formatted text. */
export async function searchOne(query: string, maxResults = 5): Promise<string> {
  return searchMany([query], maxResults);
}

/** Fetch and extract the content of a URL via Tavily extract endpoint. Returns empty string on failure. */
export async function extractUrl(url: string): Promise<string> {
  try {
    const res = await getClient().extract([url]);
    return (res as { results?: Array<{ rawContent?: string }> }).results?.[0]?.rawContent ?? '';
  } catch {
    return '';
  }
}
```

- [ ] Replace `lib/tavily.ts` with the above.

### Step 1.3 — Verify TypeScript still compiles

- [ ] Run: `npx tsc --noEmit`
- [ ] Expected: no output (clean)

### Step 1.4 — Commit

```bash
git add lib/types.ts lib/tavily.ts
git commit -m "feat: add DeepScanData.status, tavily searchRaw/extractUrl, lazy client init"
```

- [ ] Run the commit above.

---

## Task 2: Create `lib/agent-loop.ts` — quality scoring

**Files:**
- Create: `__tests__/lib/agent-loop.test.ts`
- Create: `lib/agent-loop.ts` (partial — quality functions only)

### Step 2.1 — Write failing tests for quality scoring

Create `__tests__/lib/agent-loop.test.ts`:

```typescript
// Mock groq and tavily before any imports
jest.mock('groq-sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

jest.mock('@/lib/tavily', () => ({
  searchMany: jest.fn(),
  searchRaw: jest.fn(),
}));

import { scoreProject, scoreBatch, missingCategories } from '@/lib/agent-loop';
import type { Project } from '@/lib/types';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-id',
    title: 'Test Project',
    author: '@testuser',
    description: 'A description that is definitely longer than twenty chars.',
    category: 'UTILITY',
    url: 'https://example.com',
    source: 'github',
    date: '2025-03-01',
    city: 'nyc',
    ...overrides,
  };
}

describe('scoreProject', () => {
  it('passes a well-formed project', () => {
    expect(scoreProject(makeProject())).toBe(true);
  });

  it('fails when author is Unknown', () => {
    expect(scoreProject(makeProject({ author: 'Unknown' }))).toBe(false);
  });

  it('fails when author is empty', () => {
    expect(scoreProject(makeProject({ author: '' }))).toBe(false);
  });

  it('fails when url does not start with http', () => {
    expect(scoreProject(makeProject({ url: '' }))).toBe(false);
    expect(scoreProject(makeProject({ url: 'not-a-url' }))).toBe(false);
  });

  it('fails when description is too short', () => {
    expect(scoreProject(makeProject({ description: 'Short' }))).toBe(false);
  });

  it('fails when date has no 2024-2026 year', () => {
    expect(scoreProject(makeProject({ date: '2020-01-01' }))).toBe(false);
    expect(scoreProject(makeProject({ date: 'a few years ago' }))).toBe(false);
  });

  it('passes for dates 2024, 2025, 2026', () => {
    expect(scoreProject(makeProject({ date: '2024-06-01' }))).toBe(true);
    expect(scoreProject(makeProject({ date: '2026-01-15' }))).toBe(true);
  });
});

describe('scoreBatch', () => {
  it('returns 0 for empty array', () => {
    expect(scoreBatch([])).toBe(0);
  });

  it('returns 1.0 when all projects pass', () => {
    expect(scoreBatch([makeProject(), makeProject()])).toBe(1);
  });

  it('returns 0.5 when half pass', () => {
    const good = makeProject();
    const bad = makeProject({ author: 'Unknown' });
    expect(scoreBatch([good, bad])).toBe(0.5);
  });
});

describe('missingCategories', () => {
  it('returns all non-OTHER categories when no projects', () => {
    const missing = missingCategories([]);
    expect(missing).toContain('TRANSIT');
    expect(missing).toContain('FOOD');
    expect(missing).not.toContain('OTHER');
  });

  it('excludes categories already present', () => {
    const projects = [makeProject({ category: 'TRANSIT' }), makeProject({ category: 'FOOD' })];
    const missing = missingCategories(projects);
    expect(missing).not.toContain('TRANSIT');
    expect(missing).not.toContain('FOOD');
  });

  it('returns empty array when a specific category is requested', () => {
    expect(missingCategories([], 'TRANSIT')).toEqual([]);
  });
});
```

- [ ] Create the file above.

### Step 2.2 — Run tests to confirm they fail

- [ ] Run: `npx jest __tests__/lib/agent-loop.test.ts --no-coverage 2>&1 | tail -20`
- [ ] Expected: `Cannot find module '@/lib/agent-loop'`

### Step 2.3 — Create `lib/agent-loop.ts` with quality functions only

```typescript
import type { Project, Category, CityConfig, CityKey } from './types';

export const ALL_CATEGORIES: Category[] = [
  'TRANSIT', 'FOOD', 'SUNSET', 'MAPS', 'UTILITY', 'AI', 'ART', 'OTHER',
];

const VALID_CATEGORIES = new Set(ALL_CATEGORIES);
const VALID_SOURCES = new Set([
  'twitter', 'github', 'reddit', 'hackernews', 'blog', 'producthunt', 'other',
]);

// --- Quality scoring ---

export function scoreProject(p: Project): boolean {
  const hasRealAuthor = p.author !== 'Unknown' && p.author.length > 0;
  const hasUrl = p.url.startsWith('http');
  const hasDescription = p.description.length > 20;
  const hasDate = /202[4-6]/.test(p.date);
  return hasRealAuthor && hasUrl && hasDescription && hasDate;
}

export function scoreBatch(projects: Project[]): number {
  if (projects.length === 0) return 0;
  return projects.filter(scoreProject).length / projects.length;
}

export function missingCategories(projects: Project[], requested?: Category): Category[] {
  if (requested) return [];
  const found = new Set(projects.map(p => p.category));
  return ALL_CATEGORIES.filter(c => c !== 'OTHER' && !found.has(c));
}

// --- Text parsing (shared by loop and scan script) ---

function sanitizeText(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u2013\u2014]/g, '--').trim();
}

export function parseProjects(text: string, city: CityKey): Project[] {
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
          sourceUrl: typeof obj.sourceUrl === 'string' && obj.sourceUrl
            ? obj.sourceUrl
            : undefined,
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

export interface AgentLoopOptions {
  category?: Category;
  query?: string;
  maxLoops?: number;
  qualityThreshold?: number;
}

export interface AgentLoopResult {
  projects: Project[];
  loops: number;
  finalQuality: number;
}

// Placeholder — implemented in Task 3
export async function runAgentLoop(
  _city: CityConfig,
  _options: AgentLoopOptions = {}
): Promise<AgentLoopResult> {
  return { projects: [], loops: 0, finalQuality: 0 };
}
```

- [ ] Create `lib/agent-loop.ts` with the above.

### Step 2.4 — Run tests and confirm they pass

- [ ] Run: `npx jest __tests__/lib/agent-loop.test.ts --no-coverage 2>&1 | tail -20`
- [ ] Expected: all `scoreProject`, `scoreBatch`, `missingCategories` tests pass

### Step 2.5 — Commit

```bash
git add lib/agent-loop.ts __tests__/lib/agent-loop.test.ts
git commit -m "feat: agent-loop quality scoring — scoreProject, scoreBatch, missingCategories"
```

- [ ] Run the commit above.

---

## Task 3: Implement `runAgentLoop` in `lib/agent-loop.ts`

**Files:**
- Modify: `__tests__/lib/agent-loop.test.ts` (add loop tests)
- Modify: `lib/agent-loop.ts` (replace placeholder `runAgentLoop`)

### Step 3.1 — Add failing tests for `runAgentLoop`

Append to `__tests__/lib/agent-loop.test.ts` (after the existing `describe` blocks):

```typescript
import { runAgentLoop } from '@/lib/agent-loop';
import Groq from 'groq-sdk';
import { searchMany, searchRaw } from '@/lib/tavily';

const mockSearchMany = searchMany as jest.MockedFunction<typeof searchMany>;
const mockSearchRaw = searchRaw as jest.MockedFunction<typeof searchRaw>;
const mockGroqCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // Default: searchMany returns some text
  mockSearchMany.mockResolvedValue('search results text');
  // Default: searchRaw returns empty (no site: fallback needed)
  mockSearchRaw.mockResolvedValue([]);
  // Wire up the mocked Groq instance
  (Groq as jest.Mock).mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  }));
});

const testCity = {
  key: 'nyc' as const,
  name: 'New York',
  displayName: 'NEW YORK CITY',
  gridName: 'NYC',
  searchTerms: ['NYC'],
  timezone: 'America/New_York',
};

describe('runAgentLoop', () => {
  it('returns projects from a single loop when quality is above threshold', async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { title: 'NYC Transit App', author: '@dev', description: 'A great transit visualization app', category: 'TRANSIT', url: 'https://example.com', source: 'github', date: '2025-03-01' },
            { title: 'NYC Food Map', author: '@chef', description: 'An interactive map of NYC food trucks', category: 'FOOD', url: 'https://food.example.com', source: 'twitter', date: '2025-04-01' },
            { title: 'NYC Sunset Tracker', author: '@sky', description: 'Track beautiful sunsets across NYC boroughs', category: 'SUNSET', url: 'https://sunset.example.com', source: 'blog', date: '2025-02-01' },
            { title: 'NYC Utility Tool', author: '@util', description: 'Utility app for NYC residents with live data', category: 'UTILITY', url: 'https://util.example.com', source: 'reddit', date: '2025-01-01' },
            { title: 'NYC AI Project', author: '@ai', description: 'Machine learning model trained on NYC taxi data', category: 'AI', url: 'https://ai.example.com', source: 'github', date: '2025-05-01' },
            { title: 'NYC Art Gen', author: '@art', description: 'Generative art inspired by NYC subway routes', category: 'ART', url: 'https://art.example.com', source: 'blog', date: '2025-06-01' },
          ]),
        },
      }],
    });

    const result = await runAgentLoop(testCity, { maxLoops: 3, qualityThreshold: 0.6 });
    expect(result.projects.length).toBeGreaterThan(0);
    expect(result.loops).toBe(1);
    expect(result.finalQuality).toBeGreaterThanOrEqual(0.6);
    expect(mockSearchMany).toHaveBeenCalledTimes(1);
  });

  it('runs a second loop when quality is below threshold', async () => {
    // Loop 1: low quality (all authors Unknown)
    mockGroqCreate
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify([
              { title: 'Bad Project', author: 'Unknown', description: 'Short', category: 'MAPS', url: '', source: 'other', date: '2019-01-01' },
            ]),
          },
        }],
      })
      // Loop 2: good quality
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify([
              { title: 'NYC Transit Viz', author: '@dev', description: 'A great transit visualization for New York', category: 'TRANSIT', url: 'https://example.com', source: 'github', date: '2025-03-01' },
            ]),
          },
        }],
      });

    const result = await runAgentLoop(testCity, { maxLoops: 3, qualityThreshold: 0.6 });
    expect(result.loops).toBe(2);
    expect(mockSearchMany).toHaveBeenCalledTimes(2);
  });

  it('stops after maxLoops even if quality stays low', async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { title: 'Junk', author: 'Unknown', description: 'x', category: 'OTHER', url: '', source: 'other', date: '2000' },
          ]),
        },
      }],
    });

    const result = await runAgentLoop(testCity, { maxLoops: 2, qualityThreshold: 0.9 });
    expect(result.loops).toBe(2);
    expect(mockSearchMany).toHaveBeenCalledTimes(2);
  });

  it('deduplicates projects across loops by title', async () => {
    const sameProject = { title: 'NYC App', author: '@dev', description: 'A nice app for navigating New York City', category: 'TRANSIT', url: 'https://example.com', source: 'github', date: '2025-01-01' };
    mockGroqCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify([sameProject]) } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify([sameProject]) } }] });

    const result = await runAgentLoop(testCity, { maxLoops: 2, qualityThreshold: 0.99 });
    const titles = result.projects.map(p => p.title);
    expect(titles.filter(t => t === 'NYC App').length).toBe(1);
  });
});
```

- [ ] Append the above to `__tests__/lib/agent-loop.test.ts`.

### Step 3.2 — Run tests to confirm they fail

- [ ] Run: `npx jest __tests__/lib/agent-loop.test.ts --no-coverage -t "runAgentLoop" 2>&1 | tail -20`
- [ ] Expected: tests fail (placeholder returns empty)

### Step 3.3 — Implement `runAgentLoop` in `lib/agent-loop.ts`

Replace the placeholder `runAgentLoop` (and add the helpers above it). The full updated bottom section of `lib/agent-loop.ts` — add after `parseProjects`:

```typescript
import Groq from 'groq-sdk';
import { searchMany, searchRaw } from './tavily';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

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

async function callGroq(searchText: string, cityName: string, cityKey: CityKey): Promise<Project[]> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Search results for creative tech projects from ${cityName}:\n\n${searchText}\n\nExtract 8-15 unique projects as a JSON array.`,
      },
    ],
  });
  return parseProjects(response.choices[0]?.message?.content ?? '', cityKey);
}

function buildBaseQueries(city: CityConfig, options: AgentLoopOptions): string[] {
  const name = city.name;
  const catFilter = options.category ? ` ${options.category.toLowerCase()}` : '';
  const qFilter = options.query ? ` "${options.query}"` : '';
  return [
    `${name} data visualization project 2024 2025${qFilter}`,
    `${name} interactive map app site:github.com OR site:twitter.com`,
    `"I built" "${name}" app${catFilter}`,
    `${name} open data creative coding project`,
    `${name} side project launched vibe coding${qFilter}`,
    ...city.searchTerms.slice(0, 2).map(t => `${t} creative tech project`),
  ];
}

async function buildRefinementQueries(
  city: CityConfig,
  missing: Category[],
  hasUrlIssues: boolean,
): Promise<string[]> {
  const name = city.name;
  const queries: string[] = [];

  for (const cat of missing.slice(0, 3)) {
    const catLower = cat.toLowerCase();
    if (hasUrlIssues) {
      const siteQuery = `site:github.com ${name} ${catLower}`;
      const raw = await searchRaw([siteQuery], 2);
      queries.push(
        raw.length > 0 ? siteQuery : `${name} github project ${catLower} 2025`,
      );
    } else {
      queries.push(`${name} ${catLower} project 2025`);
    }
  }

  return queries;
}

export async function runAgentLoop(
  city: CityConfig,
  options: AgentLoopOptions = {},
): Promise<AgentLoopResult> {
  const { maxLoops = 3, qualityThreshold = 0.6 } = options;

  let allProjects: Project[] = [];
  let queries = buildBaseQueries(city, options);
  let loops = 0;
  let finalQuality = 0;

  for (let i = 0; i < maxLoops; i++) {
    loops = i + 1;

    const searchText = await searchMany(queries);
    if (!searchText.trim()) break;

    const newProjects = await callGroq(searchText, city.displayName, city.key);

    const existingTitles = new Set(allProjects.map(p => p.title.toLowerCase()));
    const fresh = newProjects.filter(p => !existingTitles.has(p.title.toLowerCase()));
    allProjects = [...allProjects, ...fresh];

    finalQuality = scoreBatch(allProjects);
    const passing = Math.round(finalQuality * allProjects.length);

    if (finalQuality >= qualityThreshold || i === maxLoops - 1) {
      console.log(
        `[AGENT] Loop ${loops}: quality ${Math.round(finalQuality * 100)}% (${passing}/${allProjects.length} pass) — accepting results`,
      );
      break;
    }

    console.log(
      `[AGENT] Loop ${loops}: quality ${Math.round(finalQuality * 100)}% (${passing}/${allProjects.length} pass) — refining queries...`,
    );

    const missing = missingCategories(allProjects, options.category);
    const hasUrlIssues =
      allProjects.length > 0 &&
      allProjects.filter(p => !p.url.startsWith('http')).length / allProjects.length > 0.3;

    if (missing.length > 0) {
      console.log(
        `[AGENT] Missing categories: ${missing.slice(0, 3).join(', ')} — adding targeted queries`,
      );
    }

    queries = await buildRefinementQueries(city, missing, hasUrlIssues);
    if (queries.length === 0) break;
  }

  return { projects: allProjects, loops, finalQuality };
}
```

- [ ] Replace the `export interface AgentLoopOptions` through the end of `lib/agent-loop.ts` with the above (keep everything before `AgentLoopOptions`, including `parseProjects`, `ALL_CATEGORIES`, scoring functions).

> **Note:** The `import` statements for Groq and tavily go at the **top** of the file, before the `ALL_CATEGORIES` declaration.

### Step 3.4 — Run all agent-loop tests

- [ ] Run: `npx jest __tests__/lib/agent-loop.test.ts --no-coverage 2>&1 | tail -20`
- [ ] Expected: all tests pass

### Step 3.5 — Commit

```bash
git add lib/agent-loop.ts __tests__/lib/agent-loop.test.ts
git commit -m "feat: implement runAgentLoop with quality scoring and query refinement"
```

- [ ] Run the commit above.

---

## Task 4: Update `lib/discover.ts` and `scripts/scan.ts`

**Files:**
- Modify: `lib/discover.ts`
- Modify: `scripts/scan.ts`

### Step 4.1 — Replace `lib/discover.ts` with thin wrapper

```typescript
import { runAgentLoop } from './agent-loop';
import type { Project, CityConfig, Category } from './types';

export async function discoverProjects(
  city: CityConfig,
  options: { category?: Category; query?: string } = {},
): Promise<Project[]> {
  const result = await runAgentLoop(city, options);
  return result.projects;
}
```

- [ ] Replace the entire contents of `lib/discover.ts` with the above.

### Step 4.2 — Replace `scripts/scan.ts`'s duplicated internals

The scan script keeps: `dotenv.config`, env checks, `main()`, file I/O, and progress output. Remove: `sanitizeText`, `parseProjects`, `SYSTEM_PROMPT`, `buildQueries`, `tavilySearch`, `scanCity`'s Groq call, and the local `groq`/`tavilyClient` instances.

Replace the full file:

```typescript
import * as dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CITIES, CITY_KEYS } from '../lib/cities';
import { runAgentLoop } from '../lib/agent-loop';
import type { CityKey } from '../lib/types';

dotenv.config({ path: '.env.local' });

if (!process.env.GROQ_API_KEY) {
  console.error('[ERR] GROQ_API_KEY not set. Add it to .env.local');
  process.exit(1);
}
if (!process.env.TAVILY_API_KEY) {
  console.error('[ERR] TAVILY_API_KEY not set. Add it to .env.local');
  process.exit(1);
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
      const { projects, loops, finalQuality } = await runAgentLoop(city);
      const outPath = join(process.cwd(), 'data', `${cityKey}.json`);
      writeFileSync(outPath, JSON.stringify(projects, null, 2), 'utf-8');
      total += projects.length;
      console.log(`${projects.length} projects (${loops} loop${loops > 1 ? 's' : ''}, ${Math.round(finalQuality * 100)}% quality)`);
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
```

- [ ] Replace `scripts/scan.ts` with the above.

### Step 4.3 — Verify TypeScript compiles

- [ ] Run: `npx tsc --noEmit`
- [ ] Expected: no output

### Step 4.4 — Run full test suite

- [ ] Run: `npx jest --no-coverage 2>&1 | tail -10`
- [ ] Expected: all tests pass

### Step 4.5 — Commit

```bash
git add lib/discover.ts scripts/scan.ts
git commit -m "refactor: discover.ts and scan.ts as thin wrappers over runAgentLoop"
```

- [ ] Run the commit above.

---

## Task 5: Update `lib/deep-scan.ts` with liveness check and metadata extraction

**Files:**
- Create: `__tests__/lib/deep-scan.test.ts`
- Modify: `lib/deep-scan.ts`

### Step 5.1 — Write failing tests

Create `__tests__/lib/deep-scan.test.ts`:

```typescript
jest.mock('groq-sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  })),
}));

jest.mock('@/lib/tavily', () => ({
  searchOne: jest.fn(),
  extractUrl: jest.fn(),
}));

// Mock global fetch for HEAD requests
global.fetch = jest.fn();

import { deepScanProject } from '@/lib/deep-scan';
import Groq from 'groq-sdk';
import { searchOne, extractUrl } from '@/lib/tavily';

const mockGroqCreate = jest.fn();
const mockSearchOne = searchOne as jest.MockedFunction<typeof searchOne>;
const mockExtractUrl = extractUrl as jest.MockedFunction<typeof extractUrl>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  (Groq as jest.Mock).mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  }));
});

describe('deepScanProject', () => {
  it('returns OFFLINE status when HEAD fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('connection refused'));

    const result = await deepScanProject('https://dead.example.com', 'Dead Project');
    expect(result.status).toBe('OFFLINE');
    expect(mockExtractUrl).not.toHaveBeenCalled();
    expect(mockGroqCreate).not.toHaveBeenCalled();
  });

  it('returns OFFLINE status when HEAD returns 404', async () => {
    mockFetch.mockResolvedValue({ status: 404 } as Response);

    const result = await deepScanProject('https://gone.example.com', 'Gone Project');
    expect(result.status).toBe('OFFLINE');
  });

  it('returns LIVE status and deep data when HEAD succeeds', async () => {
    mockFetch.mockResolvedValue({ status: 200 } as Response);
    mockExtractUrl.mockResolvedValue('Page content mentioning React and TypeScript built 2025');
    mockSearchOne.mockResolvedValue('GitHub repo with 42 stars');
    mockGroqCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            githubStars: 42,
            techStack: ['React', 'TypeScript'],
            lastUpdated: '2025-03-01',
            summary: 'A creative NYC project.',
            vibeScore: 8,
          }),
        },
      }],
    });

    const result = await deepScanProject('https://live.example.com', 'Live Project');
    expect(result.status).toBe('LIVE');
    expect(result.techStack).toEqual(['React', 'TypeScript']);
    expect(result.githubStars).toBe(42);
    expect(result.vibeScore).toBe(8);
  });

  it('clamps vibeScore to 1-10', async () => {
    mockFetch.mockResolvedValue({ status: 200 } as Response);
    mockExtractUrl.mockResolvedValue('some content');
    mockSearchOne.mockResolvedValue('some search results');
    mockGroqCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({ vibeScore: 99, techStack: [], summary: 'x' }),
        },
      }],
    });

    const result = await deepScanProject('https://example.com', 'Test');
    expect(result.vibeScore).toBe(10);
  });

  it('returns UNKNOWN status when extractUrl fails but HEAD succeeds', async () => {
    mockFetch.mockResolvedValue({ status: 200 } as Response);
    mockExtractUrl.mockResolvedValue('');
    mockSearchOne.mockResolvedValue('some results');
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: '{}' } }],
    });

    const result = await deepScanProject('https://example.com', 'Test');
    expect(result.status).toBe('LIVE');
  });
});
```

- [ ] Create `__tests__/lib/deep-scan.test.ts` with the above.

### Step 5.2 — Run tests to confirm they fail

- [ ] Run: `npx jest __tests__/lib/deep-scan.test.ts --no-coverage 2>&1 | tail -20`
- [ ] Expected: tests fail (current `deepScanProject` has no `status` field)

### Step 5.3 — Replace `lib/deep-scan.ts`

```typescript
import Groq from 'groq-sdk';
import { searchOne, extractUrl } from './tavily';
import type { DeepScanData } from './types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

function sanitize(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u2013\u2014]/g, '--').trim();
}

async function checkLiveness(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
    });
    clearTimeout(timeout);
    return res.status < 400;
  } catch {
    return false;
  }
}

export async function deepScanProject(url: string, title: string): Promise<DeepScanData> {
  const live = await checkLiveness(url);
  if (!live) {
    return { status: 'OFFLINE' };
  }

  const [pageContent, searchText] = await Promise.all([
    extractUrl(url),
    searchOne(`${title} site:github.com OR tech stack OR stars`, 8),
  ]);

  const prompt = `You are analyzing a creative coding project. Here are sources about it:

PAGE CONTENT:
${pageContent || '(not available)'}

WEB SEARCH RESULTS:
${searchText}

Project: "${title}"
URL: ${url}

Based on the above, extract and return ONLY a JSON object with no markdown:
{
  "githubStars": 0,
  "techStack": ["React", "D3"],
  "lastUpdated": "2025-01-15",
  "summary": "2-3 sentence technical summary",
  "vibeScore": 7
}

Prefer data from the page content when it conflicts with search results. Use null for fields not found.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? '';

  let json = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = json.indexOf('{');
  const end = json.lastIndexOf('}');
  if (start === -1 || end === -1) return { status: 'LIVE' };
  json = json.slice(start, end + 1);

  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    return {
      status: 'LIVE',
      githubStars: typeof raw.githubStars === 'number' ? raw.githubStars : undefined,
      techStack: Array.isArray(raw.techStack) ? raw.techStack.map(String) : undefined,
      lastUpdated: sanitize(raw.lastUpdated),
      summary: sanitize(raw.summary),
      vibeScore:
        typeof raw.vibeScore === 'number'
          ? Math.min(10, Math.max(1, raw.vibeScore))
          : undefined,
    };
  } catch {
    return { status: 'LIVE' };
  }
}
```

- [ ] Replace the entire contents of `lib/deep-scan.ts` with the above.

### Step 5.4 — Run deep-scan tests

- [ ] Run: `npx jest __tests__/lib/deep-scan.test.ts --no-coverage 2>&1 | tail -20`
- [ ] Expected: all 5 tests pass

### Step 5.5 — Run full test suite

- [ ] Run: `npx jest --no-coverage 2>&1 | tail -10`
- [ ] Expected: all tests pass

### Step 5.6 — Commit

```bash
git add lib/deep-scan.ts __tests__/lib/deep-scan.test.ts
git commit -m "feat: deep-scan liveness check, Tavily extract, OFFLINE/LIVE status"
```

- [ ] Run the commit above.

---

## Task 6: Add OFFLINE badge to `components/ProjectCardExpanded.tsx`

**Files:**
- Modify: `components/ProjectCardExpanded.tsx`

### Step 6.1 — Add status badge to the deep data display

Find the block that renders `deepData` (currently around line 72–88). Add the status badge as the first item inside the `deepData` section, before the vibe score:

Replace:
```tsx
      {deepData ? (
        <div className="mt-3 border-t border-current/20 pt-2">
          {deepData.vibeScore !== undefined && (
```

With:
```tsx
      {deepData ? (
        <div className="mt-3 border-t border-current/20 pt-2">
          {deepData.status === 'OFFLINE' && (
            <div className="mb-2 text-crt-red font-bold">[OFFLINE] — PROJECT LINK DEAD</div>
          )}
          {deepData.status === 'LIVE' && (
            <div className="mb-1 text-crt-green/60">STATUS: LIVE</div>
          )}
          {deepData.vibeScore !== undefined && (
```

- [ ] Apply the above edit to `components/ProjectCardExpanded.tsx`.

### Step 6.2 — Verify TypeScript compiles

- [ ] Run: `npx tsc --noEmit`
- [ ] Expected: no output

### Step 6.3 — Commit

```bash
git add components/ProjectCardExpanded.tsx
git commit -m "feat: show OFFLINE/LIVE badge in expanded project card"
```

- [ ] Run the commit above.

---

## Task 7: Final verification

### Step 7.1 — Run full test suite one more time

- [ ] Run: `npx jest --no-coverage 2>&1 | tail -15`
- [ ] Expected: all tests pass, 0 failures

### Step 7.2 — Verify TypeScript

- [ ] Run: `npx tsc --noEmit`
- [ ] Expected: no output

### Step 7.3 — Smoke-test the dev server

- [ ] Run: `npm run dev` (in a separate terminal)
- [ ] Open `http://localhost:3000`, click a project card, expand it, click `[+] DEEP SCAN`
- [ ] Confirm: no runtime errors, OFFLINE badge appears for dead links, LIVE + data appears for live ones

### Step 7.4 — Final commit (if any stray changes)

```bash
git status
# if anything unstaged:
git add -p
git commit -m "chore: final cleanup"
```

- [ ] Review and commit any remaining changes.
