import Groq from 'groq-sdk';
import { searchGitHubProjects, type GitHubSearchParams } from './github';
import { recordToolCall, type ToolProvider } from './instrumentation';
import type { Project, CityKey } from './types';

export type ToolName = 'github_search' | 'parse_projects';
export type { ToolProvider };

interface ToolDefinition {
  name: ToolName;
  provider: ToolProvider;
  schema: Record<string, string>;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'github_search',
    provider: 'github',
    schema: { query: 'string', maxResults: 'number', city: 'CityConfig' },
  },
  {
    name: 'parse_projects',
    provider: 'groq',
    schema: { rawResults: 'string', city: 'string' },
  },
];

export interface ParseProjectsParams {
  rawResults: string;
  city: string;
  cityKey: CityKey;
}

type ToolParams = {
  github_search: GitHubSearchParams;
  parse_projects: ParseProjectsParams;
};

type ToolResults = {
  github_search: Project[];
  parse_projects: Project[];
};

let groq: Groq | null = null;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
  return groq;
}

const VALID_CATEGORIES = new Set<string>([
  'TRANSIT',
  'FOOD',
  'SUNSET',
  'MAPS',
  'UTILITY',
  'AI',
  'ART',
  'OTHER',
]);

const VALID_SOURCES = new Set<string>([
  'twitter',
  'github',
  'reddit',
  'hackernews',
  'blog',
  'producthunt',
  'other',
]);

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
  "date": "YYYY or YYYY-MM format only — if only a relative date is available, estimate the year. Never use words like 'recently', 'ago', 'last week', etc.",
  "likes": 0
}

Only include REAL projects from the search results. Do not invent anything.

Author extraction rules (in priority order):
- GitHub repo → use the repo owner as author (format: "@owner")
- Tweet/X post → use the Twitter/X handle (format: "@handle")
- Blog post or article → use the byline name
- Reddit post → use the Reddit username (format: "u/username")
- Only fall back to "Unknown" as absolute last resort when zero author signal exists`;

function sanitizeText(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u2013\u2014]/g, '--').trim();
}

function parseProjectJson(text: string, city: CityKey): Project[] {
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
            ? (String(obj.category) as Project['category'])
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

async function parseProjectsWithGroq(params: ParseProjectsParams): Promise<Project[]> {
  const response = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Search results for creative tech projects from ${params.city}:\n\n${params.rawResults}\n\nExtract 8-15 unique projects as a JSON array.`,
      },
    ],
  });
  return parseProjectJson(response.choices[0]?.message?.content ?? '', params.cityKey);
}

function definitionFor(toolName: ToolName): ToolDefinition {
  const definition = TOOLS.find(tool => tool.name === toolName);
  if (!definition) throw new Error(`Unknown tool: ${toolName}`);
  return definition;
}

export async function execute<TName extends ToolName>(
  toolName: TName,
  params: ToolParams[TName],
): Promise<ToolResults[TName]> {
  const definition = definitionFor(toolName);

  return recordToolCall(toolName, definition.provider, async () => {
    switch (toolName) {
      case 'github_search':
        return searchGitHubProjects(params as GitHubSearchParams) as Promise<ToolResults[TName]>;
      case 'parse_projects':
        return parseProjectsWithGroq(params as ParseProjectsParams) as Promise<ToolResults[TName]>;
      default:
        throw new Error(`Unhandled tool: ${toolName satisfies never}`);
    }
  });
}
