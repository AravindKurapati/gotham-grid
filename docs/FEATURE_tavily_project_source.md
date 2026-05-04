# FEATURE: Tavily as a non-GitHub project source

## Why

The scanner currently only finds projects with a GitHub repo. A lot of
relevant creative tech work for a given city lives elsewhere -- Observable
notebooks, Glitch apps, agency blog posts, civic-tech directory pages, art
project write-ups. Adding Tavily as a parallel source surfaces that long
tail, increases project diversity per city, and improves coverage of the
non-developer-tooling categories (ART, SUNSET, FOOD).

This feature was foreshadowed by `TWEAK_remove_deep_scan.md`, which kept
`lib/tavily.ts` and the `TAVILY_API_KEY` env var explicitly for this work.

## Approach

Extend the existing agent loop with a Tavily branch. Each scan runs both
sources in parallel:

- **GitHub branch** (existing): `searchGitHubProjects` -> `Project[]` directly,
  via the GitHub repo mapper. `source: "github"`, real authors, YYYY-MM dates.
- **Tavily branch** (new): Tavily web search -> raw text blob -> `parse_projects`
  (Groq) -> `Project[]`. Sources end up as `blog | reddit | hackernews | other`.

Results are merged and deduped by URL (case-insensitive, trailing-slash
normalized) and by title (lowercased). Tavily results matching a GitHub URL
are dropped -- GitHub branch wins, since its data is structured.

The existing quality scorer (`scoreProject`) and refinement logic apply to
the merged set unchanged.

## Graceful degrade

If `TAVILY_API_KEY` is not set:

- The Tavily branch is skipped entirely. No request is made, no error is
  thrown. Scanner returns GitHub-only results.
- The skip is logged once: `[AGENT] TAVILY_API_KEY not set -- skipping web
  source, GitHub-only`.
- The "site works without API keys" promise in the README still holds.

If `TAVILY_API_KEY` is set but the Tavily call fails (network, rate limit,
auth):

- Log the error and continue with GitHub results. The scan does not fail.

## Scope

### Edited

- `lib/tools.ts`
  - Re-added `web_search` tool entry, provider `tavily`. Wired to `searchMany`
    from `lib/tavily.ts`.
- `lib/agent-loop.ts`
  - `buildTavilyBaseQueries(city, options)`: city-specific web queries (no
    `pushed:` qualifier; broader phrasing aimed at blogs/civic sites).
  - `searchTavilyProjects(city, queries)`: calls `web_search`, filters out
    github.com URLs, calls `parse_projects`, returns `Project[]`. Returns `[]`
    if no key set or call fails.
  - `isGitHubUrl(url)`, `normalizeUrl(url)`, `mergeAndDedupe(existing, incoming)`:
    URL normalization and dedup helpers extracted for clarity.
  - `runAgentLoopInner`: first loop runs GitHub + Tavily in parallel via
    `Promise.all`; subsequent loops are GitHub-only to keep Tavily credits low.
- `README.md`: updated agent-loop description, stack list, env var docs, test count.
- `.env.example`: cleaned up (removed stale `ANTHROPIC_API_KEY`), updated comments.

### Added

- `docs/FEATURE_tavily_project_source.md` (this file)
- 4 new tests in `__tests__/lib/agent-loop.test.ts`:
  - Key unset -> Tavily branch skipped, no `web_search` or `parse_projects` calls.
  - Key set -> 6 `web_search` calls + 1 `parse_projects`; both GitHub and blog
    results appear in final set.
  - Tavily result whose URL is github.com -> filtered before merge.
  - Tavily `web_search` throws -> run still completes with GitHub-only results.

### Untouched

- Dashboard UI / LIVE SCAN button -- no UI changes.
- `scoreProject` quality logic -- works on merged set as-is.
- Scheduled GitHub Actions workflow -- Tavily secret would need to be added
  separately if/when scheduled scans should include web results.

## Cost (notional)

Real out-of-pocket cost is **$0**: Tavily free tier provides 1,000
credits/month (we use ~300/month at the current scan cadence) and Groq's
LLaMA 3.3 70B free tier covers `parse_projects`.

The `TAVILY_SEARCH_COST` / `GROQ_PARSE_COST` constants in
`lib/instrumentation.ts` are notional values used only to bound runaway
iteration via `maxCostPerRun`; they don't reflect billing. Replacing them
with an honest `maxToolCallsPerRun` counter is a separate cleanup.

## Data shape impact

No persistent database. Impact on `data/<city>.json`:

- New entries with `source: "blog" | "reddit" | "hackernews" | "other"` will
  appear alongside existing `source: "github"` entries.
- `Project` type does **not** change. `likes` may be 0 for blog/web entries.
- `date` field comes from Groq parsing -- format is `YYYY` or `YYYY-MM` per
  the existing system prompt. The scorer's `/202[4-6]/` regex still applies.
- No migration needed; existing `data/*.json` files remain valid.

## Verification

- `npx tsc --noEmit` clean.
- `npm test` passes; 31 tests across 3 suites.
- Manual: with `TAVILY_API_KEY` set in `.env.local`, run `npm run dev`, click
  LIVE SCAN, confirm at least one non-`github` source label appears.
- Manual: with `TAVILY_API_KEY` unset, LIVE SCAN succeeds, GitHub-only, logs
  the skip line once.
- `npm run scan` end-to-end against one city: trace JSON in `data/traces/`
  shows tool calls for both `tavily` and `github` providers.
