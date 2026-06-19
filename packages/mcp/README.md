# figma-config-2026-mcp

MCP server that exposes Figma Config conference data as 5 queryable tools
for Claude and other MCP-compatible clients. Runs in two modes: local stdio
(npm) and hosted HTTP (Vercel).

## npm

```bash
npx figma-config-2026-mcp
```

Requires Node.js ≥ 18. ESM only.

## Source files

| File | Purpose |
|---|---|
| `src/index.ts` | stdio entry point — loads data from cache (or scrapes on cold start), starts MCP server |
| `src/server.ts` | MCP `Server` instance — defines 5 tool schemas, routes `tools/call` requests |
| `src/tools.ts` | Tool implementations: `getAgenda`, `getSession`, `getSpeakers`, `searchSessions`, `getEventSummary` |
| `api/mcp.ts` | Vercel HTTP handler — plain JSON-RPC endpoint, reads pre-committed `data/data.json` |
| `data/data.json` | Static data snapshot committed for the Vercel deployment |

## Two execution modes

**stdio (local)** — `npx figma-config-2026-mcp`. On cold start, scrapes `config.figma.com`
(~90 seconds) and caches at `~/.cache/figma-config/` for 24 hours. Subsequent starts are instant.

**HTTP (Vercel)** — Deployed at `https://figma-config-llms-txt-mcp.vercel.app/mcp`.
Serves from pre-committed `data/data.json` — always instant, no scraping.

## Tools

| Tool | Description |
|---|---|
| `get_agenda` | Agenda overview or filtered session list (by date / tag / stage) |
| `get_session` | Full session details by UUID or fuzzy title match |
| `get_speakers` | Speaker list, filterable by name or company |
| `search_sessions` | Full-text fuzzy search across titles, descriptions, tags, and speakers |
| `get_event_summary` | High-level event overview for LLM context |

## Constraints

- Node.js ≥ 18 (stdio mode); ESM only
- stdio cold start: ~90 seconds; subsequent starts instant (24h cache)
- Vercel mode reads static `data/data.json` — updating data requires a new commit + deploy

## Related

- [`figma-config-llms-txt`](../cli) — CLI that generates the `data.json` this server reads
- [`@yenlai/figma-config-core`](../core) — Shared scraper and parser (internal dependency)

## License

MIT
