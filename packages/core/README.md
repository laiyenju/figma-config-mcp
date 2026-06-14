# @yenlai/figma-config-core

Shared scraper, parser, and formatter for Figma Config conference data.
The internal engine that both `figma-config-llms-txt` and `figma-config-2026-mcp` depend on.

## npm

Published: `@yenlai/figma-config-core@1.0.0` ✅

```bash
npm install @yenlai/figma-config-core
```

## Source files

| File | Purpose |
|---|---|
| `src/types.ts` | TypeScript interfaces: `Session`, `Speaker`, `AgendaDay`, `ParsedData` |
| `src/scraper.ts` | Fetch sitemap and pages; 3× retry with exponential backoff; 1000ms delay between requests |
| `src/cache.ts` | 24-hour TTL disk cache via `cacache`, stored at `~/.cache/figma-config/` |
| `src/parser.ts` | Parse HTML with Cheerio: session pages, agenda page, speakers page |
| `src/formatter.ts` | Format `ParsedData` into `llms.txt`, `agenda.md`, `speakers.md`, and per-session `.md` files |
| `src/pipeline.ts` | `buildData()` — orchestrates scrape → parse → merge into a single `ParsedData` object |
| `src/index.ts` | Re-exports all public APIs |

## Usage

```ts
import { buildData, writeOutput } from '@yenlai/figma-config-core';

const data = await buildData('san-francisco');
await writeOutput(data, './output');
```

Individual functions can also be imported directly:

```ts
import { fetchSitemap, parseSessionPage, formatAgendaMd } from '@yenlai/figma-config-core';
```

## Constraints

- Node.js ≥ 18 (uses native `fetch`)
- ESM only — no CommonJS support
- First run scrapes `config.figma.com` (~90 seconds); subsequent runs use the 24-hour cache
- Request delay defaults to 1000ms; configurable via `ScrapeOptions.delay`

## License

MIT
