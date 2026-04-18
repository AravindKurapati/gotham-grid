import { execute } from './tools';
import {
  getCurrentTrace,
  logTraceSummary,
  saveAgentTrace,
  totalTraceCost,
  withAgentTrace,
} from './instrumentation';
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
  maxCostPerRun?: number;
}

export interface AgentLoopResult {
  projects: Project[];
  loops: number;
  finalQuality: number;
  budgetExceeded?: boolean;
  timedOut?: boolean;
  warning?: string;
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
      const raw = await execute('web_search', { query: siteQuery, maxResults: 2 });
      queries.push(raw.trim() ? siteQuery : `${name} github project ${catLower} 2025`);
    } else {
      queries.push(`${name} ${catLower} project 2025`);
    }
  }

  return queries;
}

async function searchQueries(queries: string[], maxResults = 5): Promise<string> {
  const chunks = await Promise.all(
    queries.map(query => execute('web_search', { query, maxResults })),
  );
  return chunks.filter(chunk => chunk.trim()).join('\n\n');
}

async function runLoopIteration<T>(fn: () => Promise<T>): Promise<T | 'timeout'> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<'timeout'>(resolve => {
        timeout = setTimeout(() => resolve('timeout'), 30_000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function hasExceededBudget(maxCostPerRun: number): boolean {
  const trace = getCurrentTrace();
  return trace ? totalTraceCost(trace) > maxCostPerRun : false;
}

async function runAgentLoopInner(
  city: CityConfig,
  options: AgentLoopOptions = {},
): Promise<AgentLoopResult> {
  const { maxLoops = 3, qualityThreshold = 0.6, maxCostPerRun = 0.1 } = options;
  const trace = getCurrentTrace();

  let allProjects: Project[] = [];
  let queries = buildBaseQueries(city, options);
  let loops = 0;
  let finalQuality = 0;
  let budgetExceeded = false;
  let timedOut = false;
  let warning: string | undefined;

  for (let i = 0; i < maxLoops; i++) {
    loops = i + 1;
    if (trace) trace.loopsRun = loops;

    const loopResult = await runLoopIteration(async () => {
      const searchText = await searchQueries(queries);
      if (!searchText.trim()) return 'empty' as const;

      return execute('parse_projects', {
        rawResults: searchText,
        city: city.displayName,
        cityKey: city.key,
      });
    });

    if (loopResult === 'timeout') {
      timedOut = true;
      warning = `Loop ${loops} exceeded 30s timeout; returning best results so far.`;
      break;
    }

    if (loopResult === 'empty') break;

    const existingTitles = new Set(allProjects.map(p => p.title.toLowerCase()));
    const fresh = loopResult.filter(p => !existingTitles.has(p.title.toLowerCase()));
    allProjects = [...allProjects, ...fresh];

    finalQuality = scoreBatch(allProjects);
    const passing = allProjects.filter(scoreProject).length;
    trace?.qualityScores.push(finalQuality);

    if (hasExceededBudget(maxCostPerRun)) {
      budgetExceeded = true;
      warning = `Agent run exceeded maxCostPerRun budget of $${maxCostPerRun.toFixed(2)}.`;
      console.warn(`[TRACE] ${warning}`);
      break;
    }

    if (finalQuality >= qualityThreshold || i === maxLoops - 1) {
      console.log(
        `[AGENT] Loop ${loops}: quality ${Math.round(finalQuality * 100)}% (${passing}/${allProjects.length} pass) -- accepting results`,
      );
      break;
    }

    console.log(
      `[AGENT] Loop ${loops}: quality ${Math.round(finalQuality * 100)}% (${passing}/${allProjects.length} pass) -- refining queries...`,
    );

    const missing = missingCategories(allProjects, options.category);
    const hasUrlIssues =
      allProjects.length > 0 &&
      allProjects.filter(p => !p.url.startsWith('http')).length / allProjects.length > 0.3;

    if (missing.length > 0) {
      console.log(
        `[AGENT] Missing categories: ${missing.slice(0, 3).join(', ')} -- adding targeted queries`,
      );
    }

    queries = await buildRefinementQueries(city, missing, hasUrlIssues);
    if (hasExceededBudget(maxCostPerRun)) {
      budgetExceeded = true;
      warning = `Agent run exceeded maxCostPerRun budget of $${maxCostPerRun.toFixed(2)}.`;
      console.warn(`[TRACE] ${warning}`);
      break;
    }
    if (queries.length === 0) break;
  }

  if (trace) {
    trace.loopsRun = loops;
    trace.finalProjectCount = allProjects.length;
    trace.timedOut = timedOut || undefined;
    trace.budgetExceeded = budgetExceeded || undefined;
    trace.warning = warning;
  }

  return { projects: allProjects, loops, finalQuality, budgetExceeded, timedOut, warning };
}

export async function runAgentLoop(
  city: CityConfig,
  options: AgentLoopOptions = {},
): Promise<AgentLoopResult> {
  const { result, trace } = await withAgentTrace(city.key, () => runAgentLoopInner(city, options));
  logTraceSummary(trace);
  try {
    saveAgentTrace(trace);
  } catch (err) {
    console.warn(
      `[TRACE] Failed to save agent trace: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return result;
}
