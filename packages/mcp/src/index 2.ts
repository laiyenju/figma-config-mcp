import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { isCacheStale } from '@figma-config/core';
import type { ParsedData } from '@figma-config/core';
import {
  getAgenda,
  getSession,
  getSpeakers,
  searchSessions,
  getEventSummary,
} from './tools.js';

const DATA_PATH = join(homedir(), '.cache', 'figma-config', 'data.json');
const DATA_CACHE_KEY = 'data.json';

async function loadData(): Promise<ParsedData> {
  const stale = await isCacheStale(DATA_CACHE_KEY);
  if (stale) {
    throw new Error(
      'Data is missing or older than 24 hours. Run `npx figma-config-llms-txt` to refresh.',
    );
  }
  try {
    const raw = await readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as ParsedData;
  } catch {
    throw new Error(
      'data.json not found. Run `npx figma-config-llms-txt --output ~/.cache/figma-config` first.',
    );
  }
}

const server = new Server(
  { name: 'figma-config-2026', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_agenda',
      description: 'Get Figma Config 2026 agenda, filterable by date, tag, and stage',
      inputSchema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            enum: ['june-23', 'june-24', 'june-25'],
            description: 'Filter by day (omit for all days)',
          },
          tag: { type: 'string', description: 'Filter by tag, e.g. "AI", "Keynote", "UX"' },
          stage: { type: 'string', description: 'Filter by stage, e.g. "Main Stage"' },
          format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
        },
      },
    },
    {
      name: 'get_session',
      description: 'Get full details for a specific session by UUID or fuzzy title match',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Session UUID' },
          title: { type: 'string', description: 'Fuzzy session title search' },
        },
      },
    },
    {
      name: 'get_speakers',
      description: 'Get speakers list, filterable by name or company',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Fuzzy speaker name search' },
          company: { type: 'string', description: 'Filter by company, e.g. "Figma"' },
          limit: { type: 'number', default: 20, description: 'Max results' },
        },
      },
    },
    {
      name: 'search_sessions',
      description: 'Full-text fuzzy search across session titles, descriptions, tags, and speakers',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Search keyword' },
          limit: { type: 'number', default: 10, description: 'Max results' },
        },
      },
    },
    {
      name: 'get_event_summary',
      description: 'Get a high-level overview of Figma Config 2026 for LLM context',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args = {} } = request.params;

  const data = await loadData();

  let content: string;
  switch (name) {
    case 'get_agenda':
      content = getAgenda(data, args as Parameters<typeof getAgenda>[1]);
      break;
    case 'get_session':
      content = getSession(data, args as Parameters<typeof getSession>[1]);
      break;
    case 'get_speakers':
      content = getSpeakers(data, args as Parameters<typeof getSpeakers>[1]);
      break;
    case 'search_sessions':
      content = searchSessions(data, args as Parameters<typeof searchSessions>[1]);
      break;
    case 'get_event_summary':
      content = getEventSummary(data);
      break;
    default:
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
      };
  }

  return { content: [{ type: 'text' as const, text: content }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
