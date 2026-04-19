jest.mock('@/lib/tools', () => ({
  execute: jest.fn(),
}));

jest.mock('@/lib/instrumentation', () => ({
  withAgentTrace: jest.fn(async (_city: string, fn: (trace: unknown) => Promise<unknown>) => {
    const trace = { city: _city, startedAt: new Date().toISOString(), loopsRun: 0, qualityScores: [], toolCalls: [], finalProjectCount: 0 };
    const result = await fn(trace);
    return { result, trace };
  }),
  logTraceSummary: jest.fn(),
  saveAgentTrace: jest.fn().mockResolvedValue('/tmp/trace.json'),
  getCurrentTrace: jest.fn().mockReturnValue(undefined),
  totalTraceCost: jest.fn().mockReturnValue(0),
}));

import { scoreProject, scoreBatch, missingCategories, runAgentLoop } from '@/lib/agent-loop';
import { execute } from '@/lib/tools';
import type { Project, CityConfig } from '@/lib/types';

const mockExecute = execute as jest.Mock;

const testCity: CityConfig = {
  key: 'nyc',
  name: 'New York',
  displayName: 'NEW YORK CITY',
  gridName: 'NYC',
  searchTerms: ['NYC'],
  timezone: 'America/New_York',
};

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

beforeEach(() => {
  mockExecute.mockReset();
  mockExecute.mockImplementation(async (toolName: string) => {
    if (toolName === 'web_search') return 'search results text';
    if (toolName === 'parse_projects') return [];
    return '';
  });
});

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

describe('runAgentLoop', () => {
  it('returns projects from a single loop when quality is above threshold', async () => {
    const goodProjects: Project[] = [
      makeProject({ title: 'NYC Transit App', author: '@dev', description: 'A great transit visualization app', category: 'TRANSIT', url: 'https://example.com', date: '2025-03-01' }),
      makeProject({ title: 'NYC Food Map', author: '@chef', description: 'An interactive map of NYC food trucks', category: 'FOOD', url: 'https://food.example.com', date: '2025-04-01' }),
      makeProject({ title: 'NYC Sunset Tracker', author: '@sky', description: 'Track beautiful sunsets across NYC boroughs', category: 'SUNSET', url: 'https://sunset.example.com', date: '2025-02-01' }),
      makeProject({ title: 'NYC Utility Tool', author: '@util', description: 'Utility app for NYC residents with live data', category: 'UTILITY', url: 'https://util.example.com', date: '2025-01-01' }),
      makeProject({ title: 'NYC AI Project', author: '@ai', description: 'Machine learning model trained on NYC taxi data', category: 'AI', url: 'https://ai.example.com', date: '2025-05-01' }),
      makeProject({ title: 'NYC Art Gen', author: '@art', description: 'Generative art inspired by NYC subway routes', category: 'ART', url: 'https://art.example.com', date: '2025-06-01' }),
    ];

    mockExecute.mockImplementation(async (toolName: string) => {
      if (toolName === 'web_search') return 'search results text';
      if (toolName === 'parse_projects') return goodProjects;
      return '';
    });

    const result = await runAgentLoop(testCity, { maxLoops: 3, qualityThreshold: 0.6 });
    expect(result.projects.length).toBeGreaterThan(0);
    expect(result.loops).toBe(1);
    expect(result.finalQuality).toBeGreaterThanOrEqual(0.6);

    const searchCalls = mockExecute.mock.calls.filter(([name]: [string]) => name === 'web_search');
    const parseCalls = mockExecute.mock.calls.filter(([name]: [string]) => name === 'parse_projects');
    expect(searchCalls).toHaveLength(6); // 5 base + 1 from searchTerms
    expect(parseCalls).toHaveLength(1);
  });

  it('runs a second loop when quality is below threshold', async () => {
    const badProject = makeProject({ title: 'Bad Project', author: 'Unknown', description: 'Short', category: 'MAPS', url: '', date: '2019-01-01' });
    const goodProjects: Project[] = [
      makeProject({ title: 'NYC Transit Viz', author: '@dev', description: 'A great transit visualization for New York', category: 'TRANSIT', url: 'https://example.com', date: '2025-03-01' }),
      makeProject({ title: 'NYC Food Finder', author: '@chef', description: 'A useful food discovery map for New York', category: 'FOOD', url: 'https://food.example.com', date: '2025-03-02' }),
    ];

    let parseCallCount = 0;
    mockExecute.mockImplementation(async (toolName: string) => {
      if (toolName === 'web_search') return 'search results text';
      if (toolName === 'parse_projects') {
        return ++parseCallCount === 1 ? [badProject] : goodProjects;
      }
      return '';
    });

    const result = await runAgentLoop(testCity, { maxLoops: 3, qualityThreshold: 0.6 });
    expect(result.loops).toBe(2);

    const searchCalls = mockExecute.mock.calls.filter(([name]: [string]) => name === 'web_search');
    const parseCalls = mockExecute.mock.calls.filter(([name]: [string]) => name === 'parse_projects');
    expect(searchCalls).toHaveLength(9); // 6 (loop 1) + 3 (refinement queries, loop 2)
    expect(parseCalls).toHaveLength(2);
  });

  it('stops after maxLoops even if quality stays low', async () => {
    const junkProject = makeProject({ title: 'Junk', author: 'Unknown', description: 'x', category: 'OTHER', url: '', date: '2000' });

    mockExecute.mockImplementation(async (toolName: string) => {
      if (toolName === 'web_search') return 'search results text';
      if (toolName === 'parse_projects') return [junkProject];
      return '';
    });

    const result = await runAgentLoop(testCity, { maxLoops: 2, qualityThreshold: 0.9 });
    expect(result.loops).toBe(2);

    const searchCalls = mockExecute.mock.calls.filter(([name]: [string]) => name === 'web_search');
    const parseCalls = mockExecute.mock.calls.filter(([name]: [string]) => name === 'parse_projects');
    expect(searchCalls).toHaveLength(9); // 6 (loop 1) + 3 (refinement, loop 2)
    expect(parseCalls).toHaveLength(2);
  });

  it('deduplicates projects across loops by title', async () => {
    const sameProject = makeProject({ title: 'NYC App', author: '@dev', description: 'A nice app for navigating New York City', category: 'TRANSIT', url: 'https://example.com', date: '2025-01-01' });

    mockExecute.mockImplementation(async (toolName: string) => {
      if (toolName === 'web_search') return 'search results text';
      if (toolName === 'parse_projects') return [sameProject];
      return '';
    });

    const result = await runAgentLoop(testCity, { maxLoops: 2, qualityThreshold: 1.1 });
    const titles = result.projects.map(p => p.title);
    expect(titles.filter(t => t === 'NYC App').length).toBe(1);
  });
});
