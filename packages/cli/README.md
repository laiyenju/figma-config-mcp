# figma-config-llms-txt

CLI tool that scrapes Figma Config conference data and exports it as
Markdown and `llms.txt` files. Built on `@yenlai/figma-config-core`.

## npm

Published: `figma-config-llms-txt@1.0.0` ✅

```bash
npx figma-config-llms-txt
```

Requires Node.js ≥ 18.

## Source files

| File | Purpose |
|---|---|
| `src/index.ts` | CLI entry point — Commander.js argument parsing, calls `buildData()` + `writeOutput()` from core |

## Output

Written to `./figma-config-output/` by default:

```
figma-config-output/
  llms.txt           # Top-level index (llmstxt.org spec)
  llms-full.txt      # All content merged
  agenda.md          # Full agenda sorted by date
  speakers.md        # All speakers
  data.json          # Structured data (read by the MCP server)
  sessions/
    <uuid>.md        # One file per session
```

## Options

| Flag | Default | Description |
|---|---|---|
| `--event <name>` | `san-francisco` | Event slug |
| `--output <dir>` | `./figma-config-output` | Output directory |
| `--only <types>` | — | Comma-separated filter: `sessions,events,speakers,faq` |
| `--delay <ms>` | `1000` | Delay between requests |
| `--cache-only` | — | Use cached pages only, no network |
| `--refresh` | — | Ignore cache and re-scrape |
| `--no-full` | — | Skip `llms-full.txt` |
| `--format <fmt>` | `both` | `markdown`, `json`, or `both` |
| `--verbose` | — | Show each URL as it scrapes |

## Examples

```bash
npx figma-config-llms-txt --only sessions
npx figma-config-llms-txt --refresh --verbose
npx figma-config-llms-txt --output ~/Desktop/figma-config
```

## Caching

Pages are cached at `~/.cache/figma-config/` with a 24-hour TTL.
Subsequent runs within 24 hours complete in seconds.

## Related

- [`figma-config-2026-mcp`](../mcp) — MCP server that reads the `data.json` this CLI produces
- [`@yenlai/figma-config-core`](../core) — Shared scraper and parser (internal dependency)

## License

MIT
