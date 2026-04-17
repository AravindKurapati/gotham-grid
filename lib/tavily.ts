import { tavily } from '@tavily/core';

const client = tavily({ apiKey: process.env.TAVILY_API_KEY ?? '' });

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

/** Run multiple queries and return deduplicated results as a formatted text block. */
export async function searchMany(queries: string[], maxPerQuery = 5): Promise<string> {
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const q of queries) {
    try {
      const res = await client.search(q, { maxResults: maxPerQuery });
      for (const r of res.results) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          results.push({ title: r.title, url: r.url, content: r.content });
        }
      }
    } catch {
      // skip failed query, continue
    }
  }

  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n');
}

/** Single query, returns formatted text. */
export async function searchOne(query: string, maxResults = 5): Promise<string> {
  return searchMany([query], maxResults);
}
