import type { Category, CityConfig, Project } from './types';

interface GitHubOwner {
  login: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  homepage?: string | null;
  description?: string | null;
  stargazers_count: number;
  updated_at: string;
  pushed_at?: string | null;
  topics?: string[];
  owner: GitHubOwner;
}

interface GitHubSearchResponse {
  items?: GitHubRepo[];
}

const CATEGORY_KEYWORDS: Array<{ category: Category; words: string[] }> = [
  { category: 'TRANSIT', words: ['transit', 'subway', 'metro', 'mta', 'tfl', 'bart', 'bus', 'train'] },
  { category: 'FOOD', words: ['food', 'restaurant', 'coffee', 'pizza', 'taco', 'bodega', 'menu'] },
  { category: 'SUNSET', words: ['sunset', 'sunrise', 'golden-hour', 'weather', 'sky'] },
  { category: 'MAPS', words: ['map', 'maps', 'geo', 'gis', 'leaflet', 'mapbox', 'cartography'] },
  { category: 'UTILITY', words: ['tool', 'utility', 'dashboard', 'tracker', 'alerts', '311', 'civic'] },
  { category: 'AI', words: ['ai', 'llm', 'gpt', 'machine-learning', 'ml', 'neural'] },
  { category: 'ART', words: ['art', 'creative-coding', 'generative', 'p5', 'threejs', 'visualization', 'dataviz'] },
];

function categoryFor(repo: GitHubRepo): Category {
  const haystack = [
    repo.name,
    repo.full_name,
    repo.description ?? '',
    ...(repo.topics ?? []),
  ].join(' ').toLowerCase();

  return CATEGORY_KEYWORDS.find(({ words }) =>
    words.some(word => new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(haystack)),
  )?.category ?? 'OTHER';
}

function cleanHomepage(homepage?: string | null): string | undefined {
  if (!homepage) return undefined;
  const trimmed = homepage.trim();
  return trimmed.startsWith('http') ? trimmed : undefined;
}

function yearMonth(date: string): string {
  return date.slice(0, 7);
}

function repoToProject(repo: GitHubRepo, city: CityConfig): Project {
  const homepage = cleanHomepage(repo.homepage);
  const updated = repo.pushed_at ?? repo.updated_at;

  return {
    id: `github-${repo.id}`,
    title: repo.name.replace(/[-_]/g, ' '),
    author: `@${repo.owner.login}`,
    description:
      repo.description?.trim() ||
      `GitHub repository related to ${city.name}, recently active on GitHub.`,
    category: categoryFor(repo),
    url: homepage ?? repo.html_url,
    sourceUrl: homepage ? repo.html_url : undefined,
    source: 'github',
    date: yearMonth(updated),
    likes: repo.stargazers_count,
    city: city.key,
  };
}

export interface GitHubSearchParams {
  query: string;
  maxResults: number;
  city: CityConfig;
}

export async function searchGitHubProjects({
  query,
  maxResults,
  city,
}: GitHubSearchParams): Promise<Project[]> {
  const url = new URL('https://api.github.com/search/repositories');
  url.searchParams.set('q', query);
  url.searchParams.set('per_page', String(Math.min(Math.max(maxResults, 1), 20)));

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const ghToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (ghToken) headers.Authorization = `Bearer ${ghToken}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub search failed: ${res.status}`);
  }

  const data = (await res.json()) as GitHubSearchResponse;
  return (data.items ?? []).map(repo => repoToProject(repo, city));
}
