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
