# figma-config-llms-txt

Convert [Figma Config 2026](https://config.figma.com) sessions, speakers, and agenda into LLM-friendly Markdown and [`llms.txt`](https://llmstxt.org) format.

## Usage

```bash
npx figma-config-llms-txt
```

Output is written to `./figma-config-output/` by default:

```
figma-config-output/
  llms.txt           # Top-level index (llmstxt.org spec)
  llms-full.txt      # All content merged — paste directly into an LLM
  agenda.md          # Full agenda sorted by date
  speakers.md        # All speakers
  data.json          # Structured data (used by the MCP server)
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
# Scrape only sessions
npx figma-config-llms-txt --only sessions

# Re-scrape with verbose output
npx figma-config-llms-txt --refresh --verbose

# Output to a custom directory
npx figma-config-llms-txt --output ~/Desktop/figma-config
```

## Caching

Pages are cached at `~/.cache/figma-config/` with a 24-hour TTL. Subsequent runs within 24 hours use the cache and complete in seconds.

## Related

- [`figma-config-2026-mcp`](https://www.npmjs.com/package/figma-config-2026-mcp) — MCP server for querying this data from Claude and other AI clients

## License

MIT
