# figma-config-2026-mcp

MCP server for [Figma Config 2026](https://config.figma.com). Query sessions, speakers, and the full agenda from Claude — in the browser or on the desktop.

## Install

Two options depending on how you use Claude:

### Option A — claude.ai browser (zero install)

Go to **claude.ai → Settings → Integrations → Add integration** and paste:

```
https://figma-config-llms-txt-mcp.vercel.app/mcp
```

That's it. No npm, no config file.

### Option B — Claude Desktop / Cursor (local)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma-config-2026": {
      "command": "npx",
      "args": ["figma-config-2026-mcp"]
    }
  }
}
```

For Cursor or other MCP clients:

```json
{
  "figma-config-2026": {
    "command": "npx",
    "args": ["figma-config-2026-mcp"]
  }
}
```

> On first use, the local server scrapes the conference site (~90 seconds). Subsequent requests use a 24-hour local cache at `~/.cache/figma-config/` and respond instantly. The remote server (Option A) uses pre-committed static data and is always instant.

## Tools

| Tool | Description |
|---|---|
| `get_agenda` | Full agenda, filterable by date / tag / stage |
| `get_session` | Single session by UUID or fuzzy title match |
| `get_speakers` | Speaker list, filterable by name or company |
| `search_sessions` | Full-text keyword search across sessions |
| `get_event_summary` | High-level event overview for LLM context |

## Example prompts

```
What sessions are on the Main Stage on June 25?
Find sessions about AI or machine learning.
Who's speaking from Google?
Tell me about the opening keynote.
```

## Related

- [`figma-config-llms-txt`](https://www.npmjs.com/package/figma-config-llms-txt) — CLI tool to export data as Markdown / llms.txt files
- [`@figma-config/core`](https://www.npmjs.com/package/@figma-config/core) — Shared scraper and parser library

## License

MIT
