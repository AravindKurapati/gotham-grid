import { execute } from './tools';
import {
  getCurrentTrace,
  logTraceSummary,
  saveAgentTrace,
  totalTraceCost,
  withAgentTrace,
} from './instrumentation';
import type { Project, Category, CityConfig } from './types';

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
  const shortName = city.gridName === 'NYC' ? 'NYC' : city.gridName;
  const userQuery = options.query ? ` ${options.query}` : '';
  const categoryQuery = options.category ? ` ${options.category.toLowerCase()}` : '';
  const updated = 'pushed:>=2025-01-01';

  return [
    `"${name}" "open data" map ${updated}${userQuery}${categoryQuery}`,
    `"${name}" dashboard visualization ${updated}${userQuery}${categoryQuery}`,
    `"${name}" transit subway bus ${updated}${userQuery}${categoryQuery}`,
    `"${name}" civic app ${updated}${userQuery}${categoryQuery}`,
    `${shortName} mapbox leaflet ${updated}${userQuery}${categoryQuery}`,
    `${shortName} creative-coding p5 ${updated}${userQuery}${categoryQuery}`,
  ];
}

function buildRefinementQueries(
  city: CityConfig,
  missing: Category[],
): string[] {
  const name = city.name;
  const updated = 'pushed:>=2025-01-01';
  return missing.slice(0, 3).map(cat => `"${name}" ${cat.toLowerCase()} ${updated}`);
}

function buildTavilyBaseQueries(city: CityConfig, options: AgentLoopOptions): string[] {
  const name = city.name;
  const short = city.gridName;
  const userQuery = options.query ? ` ${options.query}` : '';
  const categoryQuery = options.category ? ` ${options.category.toLowerCase()}` : '';
  const extra = `${userQuery}${categoryQuery}`;

  return [
    // Hacker News Show HN — devs posting projects
    `site:news.ycombinator.com "Show HN" "${name}" 2025 2026${extra}`,
    `site:news.ycombinator.com "Show HN" "${short}" 2025 2026${extra}`,

    // Reddit — city subreddits + project subreddits
    `site:reddit.com "I built" "${name}" app 2025 2026${extra}`,
    `site:reddit.com "${short}" "I made" OR "I created" project 2026${extra}`,
    `site:reddit.com "${name}" visualization OR dashboard OR "open data" 2026${extra}`,

    // Product Hunt — startup/indie app launches
    `site:producthunt.com "${name}" 2025 2026${extra}`,
    `site:producthunt.com "${short}" app launch 2026${extra}`,

    // Observable — data viz notebooks
    `site:observablehq.com "${name}" 2025 2026${extra}`,

    // dev.to / Hashnode — developer blogs
    `site:dev.to "I built" "${name}" 2025 2026${extra}`,
    `site:hashnode.com "${name}" project 2026${extra}`,

    // Shipping language people actually use
    `"I built" "${name}" app 2026${extra}`,
    `"built in ${name}" OR "made in ${name}" project 2026${extra}`,
    `"${short}" "side project" OR "weekend project" 2025 2026${extra}`,

    // Civic / creative tech
    `"${name}" civic tech "open data" project 2026${extra}`,
    `"${name}" generative art creative coding 2025 2026${extra}`,
    `"${name}" transit OR subway app 2025 2026${extra}`,

    // Glitch / Codepen — hosted demos
    `site:glitch.com "${name}" 2025 2026${extra}`,
    `site:codepen.io "${name}" OR "${short}" 2025 2026${extra}`,
  ];
}

async function searchGitHubQueries(
  city: CityConfig,
  queries: string[],
  maxResults = 8,
): Promise<Project[]> {
  const batches = await Promise.all(
    queries.map(query => execute('github_search', { query, maxResults, city })),
  );
  return batches.flat();
}

const TAVILY_BATCH_SIZE = 6;

async function searchTavilyProjects(
  city: CityConfig,
  queries: string[],
): Promise<Project[]> {
  if (!process.env.TAVILY_API_KEY) {
    console.log('[AGENT] TAVILY_API_KEY not set -- skipping web source, GitHub-only');
    return [];
  }
  try {
    const texts = await Promise.all(
      queries.map(query => execute('web_search', { query, maxResults: 3 })),
    );

    // Batch results to stay within Groq's TPM limit
    const allProjects: Project[] = [];
    for (let i = 0; i < texts.length; i += TAVILY_BATCH_SIZE) {
      const batch = texts.slice(i, i + TAVILY_BATCH_SIZE);
      const combined = batch.filter(t => typeof t === 'string' && t.length > 0).join('\n\n');
      if (!combined) continue;

      const projects = await execute('parse_projects', {
        rawResults: combined,
        city: city.name,
        cityKey: city.key,
      });
      allProjects.push(...projects.filter(p => !isGitHubUrl(p.url)));
    }

    return allProjects;
  } catch (err) {
    console.warn(
      `[AGENT] Tavily branch failed: ${err instanceof Error ? err.message : String(err)} -- continuing with GitHub-only`,
    );
    return [];
  }
}

function isGitHubUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'github.com' || host.endsWith('.github.com');
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function mergeAndDedupe(existing: Project[], incoming: Project[]): Project[] {
  const seenTitles = new Set(existing.map(p => p.title.toLowerCase()));
  const seenUrls = new Set(existing.map(p => normalizeUrl(p.url)));
  const fresh: Project[] = [];
  for (const project of incoming) {
    const title = project.title.toLowerCase();
    const url = normalizeUrl(project.url);
    if (seenTitles.has(title) || seenUrls.has(url)) continue;
    seenTitles.add(title);
    seenUrls.add(url);
    fresh.push(project);
  }
  return [...existing, ...fresh];
}

async function runLoopIteration<T>(fn: () => Promise<T>): Promise<T | 'timeout'> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<'timeout'>(resolve => {
        timeout = setTimeout(() => resolve('timeout'), 60_000);
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
    const isFirstLoop = i === 0;

    const loopResult = await runLoopIteration(async () => {
      const githubPromise = searchGitHubQueries(city, queries);
      const tavilyPromise = isFirstLoop
        ? searchTavilyProjects(city, buildTavilyBaseQueries(city, options))
        : Promise.resolve<Project[]>([]);
      const [githubProjects, tavilyProjects] = await Promise.all([githubPromise, tavilyPromise]);
      const projects = [...githubProjects, ...tavilyProjects];
      return projects.length > 0 ? projects : 'empty' as const;
    });

    if (loopResult === 'timeout') {
      timedOut = true;
      warning = `Loop ${loops} exceeded 30s timeout; returning best results so far.`;
      break;
    }

    if (loopResult === 'empty') break;

    allProjects = mergeAndDedupe(allProjects, loopResult);

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

    if (missing.length > 0) {
      console.log(
        `[AGENT] Missing categories: ${missing.slice(0, 3).join(', ')} -- adding targeted queries`,
      );
    }

    queries = buildRefinementQueries(city, missing);
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
    await saveAgentTrace(trace);
  } catch (err) {
    console.warn(
      `[TRACE] Failed to save agent trace: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return result;
}
