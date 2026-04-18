import { tavily } from '@tavily/core';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

// Lazy init so dotenv has time to load before first use (needed by scripts/scan.ts)
let _client: ReturnType<typeof tavily> | null = null;
function getClient() {
  if (!_client) _client = tavily({ apiKey: process.env.TAVILY_API_KEY ?? '' });
  return _client;
}

/** Run queries, return raw deduplicated results. */
export async function searchRaw(queries: string[], maxPerQuery = 5): Promise<SearchResult[]> {
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const q of queries) {
    try {
      const res = await getClient().search(q, { maxResults: maxPerQuery });
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

  return results;
}

/** Run multiple queries, return deduplicated results as formatted text. */
export async function searchMany(queries: string[], maxPerQuery = 5): Promise<string> {
  const results = await searchRaw(queries, maxPerQuery);
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n');
}

/** Single query, returns formatted text. */
export async function searchOne(query: string, maxResults = 5): Promise<string> {
  return searchMany([query], maxResults);
}

/** Fetch and extract the content of a URL via Tavily extract endpoint. Returns empty string on failure. */
export async function extractUrl(url: string): Promise<string> {
  try {
    const res = await getClient().extract([url]);
    return res.results[0]?.rawContent ?? '';
  } catch {
    return '';
  }
}
