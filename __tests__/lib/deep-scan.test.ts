const mockGroqCreate = jest.fn();

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  })),
}));

jest.mock('@/lib/tavily', () => ({
  searchOne: jest.fn(),
  extractUrl: jest.fn(),
}));

global.fetch = jest.fn();

import { deepScanProject } from '@/lib/deep-scan';
import { searchOne, extractUrl } from '@/lib/tavily';

const mockSearchOne = searchOne as jest.MockedFunction<typeof searchOne>;
const mockExtractUrl = extractUrl as jest.MockedFunction<typeof extractUrl>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  mockGroqCreate.mockReset();
  mockSearchOne.mockReset();
  mockExtractUrl.mockReset();
  mockFetch.mockReset();
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

  it('returns LIVE status when extractUrl is empty but HEAD succeeds', async () => {
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
