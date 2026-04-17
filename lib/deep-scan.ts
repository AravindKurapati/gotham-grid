import Groq from 'groq-sdk';
import { searchOne } from './tavily';
import type { DeepScanData } from './types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

function sanitize(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u2013\u2014]/g, '--').trim();
}

export async function deepScanProject(url: string, title: string): Promise<DeepScanData> {
  const searchText = await searchOne(`${title} site:github.com OR tech stack OR stars`, 8);

  const prompt = `You are analyzing a creative coding project. Here are web search results about it:

${searchText}

Project: "${title}"
URL: ${url}

Based on the search results above, extract and return ONLY a JSON object with no markdown:
{
  "githubStars": 0,
  "techStack": ["React", "D3"],
  "lastUpdated": "2025-01-15",
  "summary": "2-3 sentence technical summary",
  "vibeScore": 7
}

Only use information found in the search results. Use null for fields not found.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? '';

  let json = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = json.indexOf('{');
  const end = json.lastIndexOf('}');
  if (start === -1 || end === -1) return {};
  json = json.slice(start, end + 1);

  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    return {
      githubStars: typeof raw.githubStars === 'number' ? raw.githubStars : undefined,
      techStack: Array.isArray(raw.techStack) ? raw.techStack.map(String) : undefined,
      lastUpdated: sanitize(raw.lastUpdated),
      summary: sanitize(raw.summary),
      vibeScore: typeof raw.vibeScore === 'number' ? Math.min(10, Math.max(1, raw.vibeScore)) : undefined,
    };
  } catch {
    return {};
  }
}
