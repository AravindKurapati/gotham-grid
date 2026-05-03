# GOTHAM GRID

**[Live demo](https://gotham-grid.vercel.app)**

Twitter has been going absolutely insane lately. People are shipping vibe-coded projects and pulling millions of views overnight, but there was no good way to actually track what was being built across different cities. 

So I made this retro agentic dashboard that tracks creative and civic tech projects across NYC, London, SF and LA.

![GOTHAM GRID dashboard](public/S1.png)

![The projects](public/S2.png)

---

## What it does

On load the dashboard shows pre-fetched project data for each city (zero API cost). Hit "LIVE SCAN" and a multi-loop AI agent kicks in: it searches GitHub repositories directly, optionally supplements with Tavily web search to surface non-GitHub projects (blogs, civic-tech sites, Observable notebooks), parses results with Groq LLaMA 3.3 70B, scores each batch for quality and refines its search queries if the results aren't good enough. Up to 3 loops, with a 30s per-loop timeout and a synthetic $0.10 cost cap per run as a safety rail. Every tool call is traced and logged to disk.

The aesthetic is full CRT phosphor terminal -- scanlines, VT323 font, green glow, boot sequence on first load.

---
## Why agentic?

The dashboard itself is the interface. The agent lives behind LIVE SCAN: it takes a city/category/query goal, builds search queries, calls discovery tools, maps results into project cards, scores result quality and refines the next search when coverage is weak.

Every scan is traced with tool calls, duration, estimated cost, quality scores and final project count.


## Agent loop

The core is in `lib/agent-loop.ts`. Each scan run:

1. Builds city-specific search queries (one set for GitHub, one set for the web)
2. In parallel: searches GitHub repositories via the GitHub API (`lib/github.ts`) and, if `TAVILY_API_KEY` is set, runs a Tavily web search (`lib/tavily.ts`) for non-GitHub project mentions
3. Maps GitHub repo metadata directly into structured project cards
4. Feeds Tavily web results to Groq (`parse_projects`) which extracts blog/site projects in the same `Project` shape; results pointing at github.com are dropped (the GitHub branch handles those)
5. Merges and dedupes both branches by title and normalized URL
6. If quality score is below 60%, refines queries and loops again -- refinement is GitHub-only; Tavily runs only on the first loop to keep credits low
7. Caps at 3 loops or the synthetic $0.10 budget, whichever comes first

Every tool call is instrumented via `lib/instrumentation.ts` -- provider, duration, estimated cost, and status are all recorded per run. Traces saved to `data/traces/`. Providers tracked: `github`, `tavily`, `groq`.

---

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS with custom CRT theme
- GitHub API for repository discovery
- Tavily for non-GitHub project discovery (optional)
- Groq SDK (LLaMA 3.3 70B Versatile) for parsing web results into project cards
- Vercel

---

## Running locally

```bash
git clone https://github.com/AravindKurapati/gotham-grid
cd gotham-grid
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

The site works without any API keys -- the static city data loads instantly. Live scan can use unauthenticated GitHub search, but `GITHUB_TOKEN` is recommended for higher rate limits. `TAVILY_API_KEY` and `GROQ_API_KEY` are optional; setting both unlocks the non-GitHub source path during live scan. Without them the scanner runs in GitHub-only mode (no errors, just less source diversity).

To regenerate the static city data:

```bash
npm run scan
```

---

## Tests

31 tests across 3 suites: agent loop (GitHub + Tavily branch, quality scoring, refinement, dedup, graceful degrade), cache TTL, and rate limiting.

```bash
npm test
```

---

## Environment variables

See `.env.example`.

- `GITHUB_TOKEN` -- optional but recommended to avoid GitHub API rate limits.
- `TAVILY_API_KEY` -- optional. Enables the non-GitHub source path. Free tier (1k credits/month) covers normal usage.
- `GROQ_API_KEY` -- optional, required only when `TAVILY_API_KEY` is set (Groq parses Tavily results into project cards). Free tier covers normal usage.
- `SCAN_CODE` -- optional. Set it to gate live scan behind an invite code.
