# Agentic Search Refinement — Design Spec
**Date:** 2026-04-18  
**Branch:** codex/mta-boot-background  
**Status:** Approved

---

## Overview

Add a self-correcting agentic loop to the project scanner and live scan. After Tavily returns results and Groq parses them, a quality evaluator scores the batch. Low-quality batches trigger targeted query refinement and re-search, up to 3 loops. Separately, deep scan gains URL liveness checking and real metadata extraction from live pages.

---

## 1. Shared Agent Loop (`lib/agent-loop.ts`)

### Interface

```ts
interface AgentLoopOptions {
  category?: Category;
  query?: string;
  maxLoops?: number;        // default 3
  qualityThreshold?: number; // default 0.60
}

interface AgentLoopResult {
  projects: Project[];
  loops: number;
  finalQuality: number;
}

export async function runAgentLoop(
  city: CityConfig,
  options: AgentLoopOptions
): Promise<AgentLoopResult>
```

### Per-iteration flow

1. Build queries for the city (query-builder logic moved here from discover.ts / scan.ts)
2. Call `searchMany()` from `lib/tavily.ts`
3. Call Groq (`llama-3.3-70b-versatile`) to parse raw results into `Project[]`
4. Score the batch — each project is checked for:
   - Real author: `author !== 'Unknown' && author.length > 0`
   - Valid URL: starts with `http`
   - Meaningful description: `description.length > 20`
   - Recent date: string contains `2024`, `2025`, or `2026`
5. `quality = passingProjects / totalProjects`
6. If `quality >= threshold` or on final loop → accept and return
7. Otherwise → generate fill-in queries, log iteration, repeat

### Query refinement

- Identify categories absent from current batch vs `ALL_CATEGORIES`
- Generate `"${cityName} ${missingCat} project 2025"` for each missing category
- If URL quality is low (>30% of projects have no valid URL):
  - Try `"site:github.com ${cityName} ${missingCat}"` first
  - If that returns 0 results, fall back to `"${cityName} github project ${missingCat} 2025"`
- Merge new results with existing good projects before re-scoring

### Console logging

```
[AGENT] Loop 1: quality 45% (5/11 pass) — refining queries...
[AGENT] Missing categories: FOOD, ART — adding targeted queries
[AGENT] Loop 2: quality 78% (7/9 pass) — accepting results
```

---

## 2. Deep Scan — Liveness Check & Metadata Extraction (`lib/deep-scan.ts`)

### Type change (`lib/types.ts`)

```ts
interface DeepScanData {
  githubStars?: number;
  techStack?: string[];
  lastUpdated?: string;
  summary?: string;
  vibeScore?: number;
  status?: 'LIVE' | 'OFFLINE' | 'UNKNOWN'; // new
}
```

### New flow in `deepScanProject()`

1. `HEAD` fetch to the project URL (2s timeout, no redirect-follow)
2. If status 4xx/5xx or fetch throws → return `{ status: 'OFFLINE' }` immediately, skip Tavily
3. If HEAD succeeds → Tavily `extract()` on the URL to get real page content
4. Feed extracted content + stored metadata to Groq:
   *"Given page content X and stored metadata Y, return the more accurate version of each field"*
5. Return merged `DeepScanData` with `status: 'LIVE'`

### Fields that can be updated by page content

- `techStack` (from mentions in page content)
- `lastUpdated` (from page footer/meta tags)
- `summary` (re-summarized from real content)
- `title` (from page `<title>` if clearly better)

### Fields NOT overwritten by page content alone

- `vibeScore` — too subjective to infer from a page scrape
- `githubStars` — requires a separate GitHub API call or reliable search snippet

---

## 3. Integration

### `lib/discover.ts`

`discoverProjects()` becomes a thin wrapper:
```ts
export async function discoverProjects(city, options) {
  const result = await runAgentLoop(city, options);
  return result.projects;
}
```
Query-building, Groq invocation, and `parseProjects` move into `agent-loop.ts`.

### `scripts/scan.ts`

`scanCity()` becomes a thin wrapper calling `runAgentLoop()`. The script keeps:
- File I/O (write to `/data/*.json`)
- CLI argument parsing
- Progress output (`> SCANNING NEW YORK CITY...`)

The duplicated `parseProjects`, inline Tavily loop, and Groq call are removed.

### `lib/tavily.ts`

No changes. `scan.ts` switches from its inline Tavily loop to `searchMany()`.

### `components/ProjectCardExpanded.tsx`

Small addition: render a `OFFLINE` badge when `deepScan.status === 'OFFLINE'`, using red CRT color (`#ff6666`). No new component needed.

---

## 4. Files changed

| File | Change |
|------|--------|
| `lib/agent-loop.ts` | **New** — shared loop, quality evaluator, query refiner |
| `lib/types.ts` | Add `status` field to `DeepScanData` |
| `lib/deep-scan.ts` | Add HEAD check + Tavily extract + metadata merge |
| `lib/discover.ts` | Thin wrapper over `runAgentLoop` |
| `scripts/scan.ts` | Remove duplicated logic, call `runAgentLoop` |
| `components/ProjectCardExpanded.tsx` | Render OFFLINE badge |

---

## 5. Out of scope

- Persisting liveness status in `/data/*.json` at build time (deep scan is always on-demand)
- Retry logic for Tavily API failures (already handled by `searchMany`'s try/catch)
- UI progress indicators for agent loop iterations (loop runs server-side; client sees final result)
