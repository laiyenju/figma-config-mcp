# figma-config-2026-mcp

MCP server for [Figma Config 2026](https://config.figma.com). Query sessions, speakers, and the full agenda from Claude Desktop, Cursor, or any [MCP](https://modelcontextprotocol.io)-compatible client.

On first use, the server automatically scrapes the conference site (~90 seconds). Subsequent requests use a 24-hour local cache and respond instantly.

## Setup

### Claude Desktop

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

### Cursor / other MCP clients

```json
{
  "figma-config-2026": {
    "command": "npx",
    "args": ["figma-config-2026-mcp"]
  }
}
```

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
Tell me about the session on design systems.
```

## Pre-scraping (optional)

To pre-populate the cache before first use, run the CLI tool:

```bash
npx figma-config-llms-txt
```

## Caching

Data is cached at `~/.cache/figma-config/` with a 24-hour TTL. Errors during scraping are logged to `~/.cache/figma-config/error.log`.

## Related

- [`figma-config-llms-txt`](https://www.npmjs.com/package/figma-config-llms-txt) — CLI tool to export data as Markdown / llms.txt files

## License

MIT
