# figma-config-mcp

Query Figma Config 2026 sessions, speakers, and agenda from Claude — no browsing required.

Built as an MCP server with two ways to use it: a hosted remote server for claude.ai browser users, and a local stdio server for Claude Desktop and Cursor users.

## Quick start

### claude.ai (browser) — zero install

Go to **Settings → Integrations → Add integration** and paste:

```
https://figma-config-llms-txt-mcp.vercel.app/mcp
```

### Claude Desktop — local

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

## What you can ask

```
What sessions are on the Main Stage on June 25?
Find sessions about AI or machine learning.
Who's speaking from Google?
Tell me about the opening keynote.
Give me a summary of Figma Config 2026.
```

## Tools

| Tool | Description |
|---|---|
| `get_agenda` | Full agenda, filterable by date / tag / stage |
| `get_session` | Single session by UUID or fuzzy title match |
| `get_speakers` | Speaker list, filterable by name or company |
| `search_sessions` | Full-text keyword search across sessions |
| `get_event_summary` | High-level event overview for LLM context |

## Packages

| Package | Description |
|---|---|
| [`figma-config-2026-mcp`](packages/mcp) | MCP server (stdio + Vercel HTTP) |
| [`figma-config-llms-txt`](packages/cli) | CLI tool — exports sessions and agenda as Markdown / llms.txt |
| [`@yenlai/figma-config-core`](packages/core) | Shared scraper, parser, and formatter |

## CLI usage

Export all sessions, agenda, and speakers to local Markdown files:

```bash
npx figma-config-llms-txt --event san-francisco --output ./output
```

## License

MIT
