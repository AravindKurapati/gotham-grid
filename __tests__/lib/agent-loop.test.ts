const mockGroqCreate = jest.fn();

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockGroqCreate,
      },
    },
  })),
}));

jest.mock('@/lib/tavily', () => ({
  searchMany: jest.fn(),
  searchRaw: jest.fn(),
}));

import { scoreProject, scoreBatch, missingCategories, runAgentLoop } from '@/lib/agent-loop';
import { searchMany, searchRaw } from '@/lib/tavily';
import type { Project, CityConfig } from '@/lib/types';

const mockSearchMany = searchMany as jest.MockedFunction<typeof searchMany>;
const mockSearchRaw = searchRaw as jest.MockedFunction<typeof searchRaw>;

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

beforeEach(() => {
  mockGroqCreate.mockReset();
  mockSearchMany.mockReset();
  mockSearchRaw.mockReset();
  mockSearchMany.mockResolvedValue('search results text');
  mockSearchRaw.mockResolvedValue([]);
});

const testCity: CityConfig = {
  key: 'nyc',
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
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify([
              { title: 'NYC Transit Viz', author: '@dev', description: 'A great transit visualization for New York', category: 'TRANSIT', url: 'https://example.com', source: 'github', date: '2025-03-01' },
              { title: 'NYC Food Finder', author: '@chef', description: 'A useful food discovery map for New York', category: 'FOOD', url: 'https://food.example.com', source: 'blog', date: '2025-03-02' },
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

    const result = await runAgentLoop(testCity, { maxLoops: 2, qualityThreshold: 1.1 });
    const titles = result.projects.map(p => p.title);
    expect(titles.filter(t => t === 'NYC App').length).toBe(1);
  });
});
