# GOTHAM GRID — Design Spec
**Date:** 2026-04-13  
**Status:** Approved

---

## Overview

GOTHAM GRID is a retro-aesthetic dashboard that aggregates vibe-coded projects from 10 global cities. It is the "Bloomberg Terminal of vibe-coding culture." Built with Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Anthropic SDK.

**Tagline:** "Scanning the grid. Tracking the vibe."

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.2.3 (App Router) | Already installed |
| UI | React 19 + TypeScript | Already installed |
| Styling | Tailwind v4 | Uses `@theme {}` in CSS, no `tailwind.config.ts` |
| AI | `@anthropic-ai/sdk ^0.88.0` | Already installed |
| Fonts | VT323 (display), IBM Plex Mono (body) | Google Fonts via next/font |
| Deployment | Vercel (free tier) | |

---

## Architecture: Hybrid Static + Live Scan

### Static layer (default)
- At build time, `scripts/scan.ts` calls Anthropic API with web search per city
- Results saved to `data/{city}.json`
- Site serves static JSON with zero runtime API cost
- Pre-populated placeholder data ships with the repo so the dashboard works immediately

### Live scan layer (optional, always enabled)
- "LIVE SCAN" button triggers real-time Anthropic API search
- Gated by: 3 free scans (localStorage counter), then invite code required
- Rate limited: 5 requests/min per IP (in-memory sliding window)
- Results cached in-memory with 30-min TTL
- No `STATIC_ONLY` env var — live scan is always on

### Environment variables
```
ANTHROPIC_API_KEY=sk-ant-...   # Required for live scan and build-time scanner
SCAN_CODE=your-secret-code     # Optional: invite code required after 3 free scans
```

---

## Visual Design: Two Themes

### Theme 1: Split-Flap (default)
Inspired by airport/train departure boards.

| Property | Value |
|---|---|
| Background | `#1a1a1a` |
| Tile background | `#222222` |
| Text | `#f0e68c` (warm yellow) |
| Border | `#333333` (2px bottom border on rows) |
| Category dots | Amber `#ffaa33` |

Projects display as horizontal tabular rows:
```
● TRANSIT   MTA REALTIME 3D           @dev_sarah   284♥   ● LIVE
● FOOD      DOLLAR SLICE INDEX        @pizzadev99  512♥   ● LIVE
● AI/ML     NYC ACCENT CLASSIFIER     @mldev       445♥   ● NEW
```

Columns: category dot + label | title | author | likes | status badge

### Theme 2: CRT Green Phosphor (alternate)
Classic terminal aesthetic.

| Property | Value |
|---|---|
| Background | `#0a0a0a` |
| Text | `#33ff33` (phosphor green) |
| Effects | Scanlines overlay, text glow, cursor blink |
| Cards | Bordered cards with `box-shadow: 0 0 8px rgba(51,255,51,0.3)` glow on hover |

### Theme toggle
- `ThemeToggle.tsx` button in header: `[FLAP / CRT]`
- Swaps `theme-flap` / `theme-crt` class on root `<html>` element
- Preference stored in `localStorage`
- All components read theme via CSS class selectors

---

## Tailwind v4 Custom Tokens

All defined in `globals.css` via `@theme {}` (no `tailwind.config.ts`):

```css
@theme {
  /* CRT theme */
  --color-crt-black: #0a0a0a;
  --color-crt-bg: #111111;
  --color-crt-green: #33ff33;
  --color-crt-green-dim: #22aa22;
  --color-crt-green-dark: #1a3a1a;
  --color-crt-green-darkest: #0d1f0d;
  --color-crt-amber: #ffaa33;
  --color-crt-red: #ff6666;
  --color-crt-pink: #ff66cc;
  --color-crt-cyan: #66ccff;
  --color-crt-purple: #cc99ff;
  --color-crt-gold: #ffcc66;
  --color-crt-gray: #888888;

  /* Split-flap theme */
  --color-flap-bg: #1a1a1a;
  --color-flap-tile: #222222;
  --color-flap-yellow: #f0e68c;
  --color-flap-border: #333333;

  /* Fonts */
  --font-display: 'VT323', monospace;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

---

## File Structure

```
gotham-grid/
├── app/
│   ├── layout.tsx                  # Root layout, VT323 + IBM Plex Mono fonts, metadata
│   ├── page.tsx                    # Server component shell, loads static JSON
│   ├── globals.css                 # All CRT/flap styles, @theme tokens, animations
│   └── api/
│       ├── discover/route.ts       # Live scan: rate limit + free-scan gate + Anthropic
│       └── deep-scan/route.ts      # Per-project deep scan
├── components/
│   ├── Dashboard.tsx               # Client orchestrator — all state lives here
│   ├── BootSequence.tsx            # Typewriter boot animation (once per session)
│   ├── Header.tsx                  # Title, city selector, theme toggle, live scan button
│   ├── CitySelector.tsx            # Terminal-style city tabs
│   ├── StatsBar.tsx                # Metric cards: total projects, this week, top category
│   ├── FilterBar.tsx               # Category filter buttons
│   ├── SearchBar.tsx               # Terminal prompt search, debounced 500ms
│   ├── ProjectGrid.tsx             # Container — renders flap board or card grid by theme
│   ├── ProjectCard.tsx             # Single project row (flap) or card (CRT)
│   ├── ProjectCardExpanded.tsx     # Expanded view: description + deep scan results
│   ├── Ticker.tsx                  # Bottom scrolling ticker (CSS infinite scroll)
│   ├── ScanlineOverlay.tsx         # CRT scanline effect (only visible in CRT theme)
│   ├── LiveScanModal.tsx           # Free scan counter + invite code gate after 3 uses
│   ├── AgentStatus.tsx             # Live scan progress display
│   ├── LoadingTerminal.tsx         # Terminal-style loading states
│   └── ThemeToggle.tsx             # [FLAP / CRT] toggle, localStorage persistence
├── lib/
│   ├── types.ts                    # All TypeScript interfaces
│   ├── cities.ts                   # 10 city configs
│   ├── categories.ts               # 8 category definitions + colors
│   ├── anthropic.ts                # Anthropic client wrapper
│   ├── discover.ts                 # Discovery logic + query builder
│   ├── deep-scan.ts                # Deep scan logic
│   ├── cache.ts                    # In-memory TTL cache (30 min)
│   └── rate-limit.ts               # Sliding window rate limiter (5/min/IP)
├── data/                           # Pre-populated static JSON (10 city files)
│   ├── nyc.json                    # 8-10 realistic placeholder projects
│   ├── london.json                 # 8-10 realistic placeholder projects
│   ├── tokyo.json                  # 8-10 realistic placeholder projects
│   └── {berlin,paris,sf,seoul,mumbai,lagos,sao_paulo}.json  # 3-5 each
├── scripts/
│   └── scan.ts                     # Build-time scanner (tsx scripts/scan.ts)
└── docs/superpowers/specs/
    └── 2026-04-13-gotham-grid-design.md
```

---

## Data Model

```typescript
interface Project {
  id: string;
  title: string;
  author: string;
  description: string;
  category: 'TRANSIT' | 'FOOD' | 'SUNSET' | 'MAPS' | 'UTILITY' | 'AI' | 'ART' | 'OTHER';
  url: string;
  source: 'twitter' | 'github' | 'reddit' | 'hackernews' | 'blog' | 'producthunt' | 'other';
  date: string;
  likes?: number;
  city: CityKey;
  deepScan?: {
    githubStars?: number;
    techStack?: string[];
    lastUpdated?: string;
    summary?: string;
    vibeScore?: number;
  };
}
```

---

## Live Scan Gating

```
Scan #1: free — localStorage counter → 1
Scan #2: free — localStorage counter → 2
Scan #3: free — localStorage counter → 3
Scan #4+: modal shows "FREE SCANS EXHAUSTED (3/3 USED)" + invite code field
          → code validated server-side against SCAN_CODE env var
          → valid code unlocks unlimited scans for session
```

Button label reflects remaining free scans: `[◆ LIVE SCAN (2/3)]`

---

## Live Scan Modal States

**While free scans remain:**
```
LIVE SCANS: 2/3 REMAINING
[◆ SCAN NOW]   [CANCEL]
```

**After 3 free scans:**
```
╔═══════════════════════════════════════╗
║  FREE SCANS EXHAUSTED (3/3 USED)     ║
╠═══════════════════════════════════════╣
║  ENTER INVITE CODE TO CONTINUE       ║
║  > CODE: ________                     ║
║  [SUBMIT]           [CANCEL]          ║
╚═══════════════════════════════════════╝
```

---

## Boot Sequence

Plays once per session (localStorage flag). Skipped if `prefers-reduced-motion`.

```
╔══════════════════════════════════════════════════╗
║              GOTHAM GRID v1.0                    ║
║         GLOBAL PROJECT SCANNER                   ║
╚══════════════════════════════════════════════════╝

[BOOT] Initializing phosphor display......... OK
[BOOT] Loading scanline matrix............... OK
[BOOT] Connecting to search grid............. OK
[BOOT] Calibrating city frequencies.......... OK
[BOOT] Mapping project signals............... OK
[BOOT] System ready.......................... OK

> WELCOME TO GOTHAM GRID
> ████████████████████████████████ 100%

[ENTER THE GRID]
```

---

## API Routes

### POST /api/discover
1. Validate invite code if `SCAN_CODE` is set AND free scans exhausted (checked server-side via header)
2. Rate limit: 5/min per IP
3. Cache check (key: `live:{city}:{category}:{query}`)
4. Anthropic API call with `web_search` tool
5. Parse + deduplicate + assign IDs
6. Cache result (30 min)
7. Return `DiscoverResponse`

Error responses (terminal-themed):
- 403: `ACCESS DENIED — INVALID SCAN CODE`
- 429: `RATE LIMIT — COOL DOWN 60s`
- 500: `SIGNAL LOST — SCANNER MALFUNCTION`

### POST /api/deep-scan
- Same rate limit + code gate
- Searches for more detail on a specific project
- Returns `DeepScanData`: vibe score, tech stack, GitHub stars, last updated

---

## Dashboard Layout

Split-flap mode (default):
```
┌─────────────────────────────────────────────────────────────────┐
│ GOTHAM GRID  [■ NYC] [LDN] [TKY] [BER] [+MORE]  [CRT/FLAP] ◆ │
├─────────────────────────────────────────────────────────────────┤
│ CATEGORY    PROJECT                    AUTHOR       ♥    STATUS │
├─────────────────────────────────────────────────────────────────┤
│ ● TRANSIT   MTA REALTIME 3D           @dev_sarah   284  ● LIVE │
│ ● FOOD      DOLLAR SLICE INDEX        @pizzadev99  512  ● LIVE │
│ ● SUNSET    GOLDEN HOUR NYC           @lightchaser 891  ● NEW  │
├─────────────────────────────────────────────────────────────────┤
│ > SEARCH THE GRID... _                    [◆ LIVE SCAN (2/3)]  │
├─────────────────────────────────────────────────────────────────┤
│ [ALL] [TRANSIT] [FOOD] [SUNSET] [MAPS] [UTILITY] [AI] [ART]   │
├─────────────────────────────────────────────────────────────────┤
│ ◆ TRENDING: Pigeon Sim ◆ NEW: Stoop Sale Finder ◆ ...         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

- **Desktop (>1024px):** Full board layout, horizontal city tabs, full stats bar
- **Tablet (768–1024px):** Board layout, stats wrap to 2 rows
- **Mobile (<768px):** Truncated columns (category + title + status only), horizontal scroll city/filter tabs

---

## Build Order

1. Setup: fonts, globals.css (all @theme tokens + CRT/flap styles + animations)
2. Types + configs: types.ts, cities.ts, categories.ts
3. Utility libs: cache.ts, rate-limit.ts, anthropic.ts
4. Scanner + static data: scripts/scan.ts + all data/*.json placeholder files
5. API routes: discover/route.ts, deep-scan/route.ts
6. Static components: ScanlineOverlay, Header, ThemeToggle, StatsBar, CitySelector, FilterBar, SearchBar, Ticker, LoadingTerminal
7. Dynamic components: ProjectCard, ProjectCardExpanded, ProjectGrid, LiveScanModal, AgentStatus
8. Boot sequence: BootSequence with typewriter animation
9. Dashboard: Dashboard.tsx orchestrator
10. Page: app/page.tsx
11. Polish: hover states, responsive tweaks, error boundaries, verify all cities/filters
