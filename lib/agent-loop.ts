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

const VALID_CATEGORIES = new Set(ALL_CATEGORIES);
const VALID_SOURCES = new Set([
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

export async function runAgentLoop(
  _city: CityConfig,
  _options: AgentLoopOptions = {},
): Promise<AgentLoopResult> {
  return { projects: [], loops: 0, finalQuality: 0 };
}
