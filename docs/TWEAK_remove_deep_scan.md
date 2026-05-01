# TWEAK: Remove deep scan

## Why

Deep scan is the per-project-card enrichment that fires when a card is expanded.
It hits Tavily (page extract + web search) and then Groq (summarize into
`techStack`, `vibeScore`, `summary`, `githubStars`). For an all-GitHub project
list it's redundant — the GitHub API already exposes stars, language, topics,
and the README. Removing it eliminates the only Tavily caller in the live UI
path and trims a Groq dependency.

Tavily itself is *not* removed in this branch — it's preserved for the upcoming
`FEATURE_tavily_project_source` work, which will use it as a non-GitHub project
source rather than per-card enrichment.

## Scope

### Delete

- `app/api/deep-scan/route.ts`
- `lib/deep-scan.ts`
- `lib/anthropic.ts` (orphan — exports an Anthropic client that nothing imports)
- `__tests__/lib/deep-scan.test.ts`

### Edit

- `components/ProjectCardExpanded.tsx`
  - Drop the `useState` for `deepData`, `loading`, `err`.
  - Drop the `handleDeepScan` fetch and the `[+] DEEP SCAN` button.
  - Drop the conditional render block showing VIBE / STACK / STARS / summary.
  - Keep description, DATE, LIKES, source link, view-project link.
  - Remove unused imports (`useState`, `DeepScanData`).
- `lib/types.ts`
  - Remove `DeepScanData` interface.
  - Remove `Project.deepScan?: DeepScanData` field.
- `lib/tools.ts`
  - Remove `web_search` and `verify_url` tool entries (dead Tavily wiring; no
    caller in the agent loop).
  - Drop `searchMany` / `extractUrl` imports (unused after the two tool
    entries are gone). `lib/tavily.ts` is left untouched and will be
    re-imported by branch B.
- `lib/instrumentation.ts`
  - Remove `'anthropic'` from the `ToolProvider` union and remove the
    `case 'anthropic'` branch in the cost-rate calculation. No tool is
    registered with that provider, so this is dead code.
- `package.json`
  - Remove `@anthropic-ai/sdk` dependency (no remaining importer after
    `lib/anthropic.ts` is deleted). Run `npm install` to refresh
    `package-lock.json`.
- `README.md`
  - Drop "Tavily for deep scan enrichment" from the stack list.
  - Drop "Anthropic SDK (deep scan)" — `lib/anthropic.ts` exists but no
    source file imports it; the README line is misleading.
  - Reword the env var section: `TAVILY_API_KEY` is reserved for the upcoming
    non-GitHub source feature; until that lands it has no effect.
  - Update the test count line ("32 tests across 4 suites" → new count).

### Keep untouched

- `lib/tavily.ts` — branch B will use it.
- `.env.example` — `TAVILY_API_KEY` line stays (future use).

## Data shape impact

No persistent database; data lives in `data/<city>.json`. Impact:

- `Project.deepScan` field is removed from the type. Existing JSON files do not
  contain `deepScan` keys (verified — scanner output never wrote them; only the
  client-side fetch populated them in memory). No data migration needed.
- `DeepScanData` type is removed entirely.

## Verification

- `npm run typecheck` clean.
- `npm test` passes; suite count drops by 1 (deep-scan suite gone).
- Manual: `npm run dev`, expand a project card on the dashboard. Card shows
  description + date + likes + source link, no Deep Scan button, no errors in
  console.
- Grep for `deep-scan`, `deepScan`, `DeepScanData` returns zero matches outside
  this spec.

## Out of scope

- Removing `lib/tavily.ts` (kept for branch B).
- Removing `TAVILY_API_KEY` from env example.
- Any change to the agent loop or scan workflow.
