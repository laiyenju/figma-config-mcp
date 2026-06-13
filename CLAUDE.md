# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **greenfield monorepo** for scraping Figma Config 2026 conference data and exposing it as LLM-friendly content. No implementation exists yet — the repo contains two spec files that define what to build.

- `spec-1-cli-figma-config.md` — CLI tool spec (`@figma-config/cli`)
- `spec-2-mcp-server-figma-config.md` — MCP server spec (`@figma-config/mcp`)

---

## Planned Monorepo Structure

```
packages/
  core/       # Shared scraper + parser + formatter (@figma-config/core)
  cli/        # npx-able CLI tool (@figma-config/cli)
  mcp/        # MCP server (@figma-config/mcp)
```

`core` must be completed before `cli` or `mcp`. The MCP server reads `data.json` produced by the CLI.

---

## Tech Stack (from specs)

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js ≥ 18 | Native fetch, ESM |
| Language | TypeScript `^5.x` | `"strict": true` required |
| HTML parsing | `cheerio ^1.x` | SSR pages, no headless browser |
| HTML → Markdown | `turndown ^7.x` + `turndown-plugin-gfm` | |
| CLI framework | `commander ^12.x` | |
| Progress | `ora ^8.x` | |
| Cache | `cacache ^18.x` | TTL 24h, stored at `~/.cache/figma-config/` |
| MCP SDK | `@modelcontextprotocol/sdk ^1.x` | stdio transport |
| Fuzzy search | `fuse.js ^7.x` | MCP server full-text search |
| Bundler | `tsup ^8.x` | |
| Test | `vitest ^1.x` | ESM support |

---

## Commands (once implemented)

```bash
# Run all tests
pnpm -r test           # or npm workspaces equivalent

# Run a single test file
npx vitest run packages/core/src/parser.test.ts

# Build all packages
pnpm -r build

# Run CLI locally (after build)
node packages/cli/dist/index.js --event san-francisco --output ./output

# Run with npx (published)
npx figma-config-llms-txt

# MCP server (published)
npx figma-config-2026-mcp
```

---

## Core Data Interfaces

These TypeScript interfaces are the canonical shape for all data flow between packages:

```typescript
interface Session {
  id: string;           // UUID from URL
  url: string;
  title: string;
  date: string;         // e.g. "Jun 25"
  time: string;         // e.g. "2:15–2:45 PM PDT"
  stage: string;        // e.g. "Main Stage"
  tags: string[];
  speakers: Speaker[];
  description: string;
  type: 'session' | 'event';
}

interface Speaker {
  name: string;
  title: string;
  company: string;
  profileUrl?: string;
}

interface AgendaDay {
  date: string;         // e.g. "June 24"
  sessions: Session[];
}
```

---

## Scraping Rules

- Source: `https://config.figma.com/sitemap.xml` → filter paths: `/session/`, `/event/`, `/speakers/`, `/agenda/`, `/sponsors/`, `/faq/`
- Minimum **1000ms delay** between requests (configurable via `--delay`)
- Retry failed requests 3× with exponential backoff (2s, 4s, 8s)
- Parse `<main>` element with Cheerio; fall back to `innerText` on parse failure (mark `[parse-error]`)
- Cache results in `~/.cache/figma-config/` with 24h TTL

---

## Output Files (CLI)

| File | Description |
|---|---|
| `llms.txt` | Top-level index per [llmstxt.org](https://llmstxt.org) spec |
| `llms-full.txt` | All content merged, for direct LLM context pasting |
| `sessions/{uuid}.md` | One file per session |
| `agenda.md` | Full agenda sorted by date |
| `speakers.md` | All speakers list |
| `data.json` | Structured data — **primary input for MCP server** |

---

## MCP Server Tools

Five tools exposed via stdio transport:

| Tool | Purpose |
|---|---|
| `get_agenda` | Full agenda, filterable by date / tag / stage |
| `get_session` | Single session by UUID or fuzzy title match |
| `get_speakers` | Speaker list, filterable by name / company |
| `search_sessions` | Full-text keyword search across sessions |
| `get_event_summary` | High-level event overview for LLM context |

MCP server reads local `data.json`; auto-triggers CLI scraper if cache is missing or >24h old. Cold start target: ≤ 3 seconds.

---

## Testing Requirements

- Coverage target: ≥ 80%
- Unit: parser and formatter functions in `packages/core`
- Integration: use local HTML fixtures (not live network)
- Snapshot: `llms.txt` and Markdown output format stability
- TypeScript strict mode must pass with zero errors
