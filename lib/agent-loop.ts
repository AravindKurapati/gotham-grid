import Groq from 'groq-sdk';
import { searchMany, searchRaw } from './tavily';
import type { Project, Category, CityConfig, CityKey } from './types';

export const ALL_CATEGORIES: Category[] = [
  'TRANSIT',
  'FOOD',
  'SUNSET',
  'MAPS',
  'UTILITY',
  'AI',
  'ART',
  'OTHER',
];

const VALID_CATEGORIES = new Set<string>(ALL_CATEGORIES);
const VALID_SOURCES = new Set<string>([
  'twitter',
  'github',
  'reddit',
  'hackernews',
  'blog',
  'producthunt',
  'other',
]);

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
    const raw: unknown = JSON.parse(json);
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
          sourceUrl:
            typeof obj.sourceUrl === 'string' && obj.sourceUrl ? obj.sourceUrl : undefined,
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

let groq: Groq | null = null;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
  return groq;
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

async function callGroq(searchText: string, cityName: string, cityKey: CityKey): Promise<Project[]> {
  const response = await getGroq().chat.completions.create({
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
      queries.push(raw.length > 0 ? siteQuery : `${name} github project ${catLower} 2025`);
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
    const passing = allProjects.filter(scoreProject).length;

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
