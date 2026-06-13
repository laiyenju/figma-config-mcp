import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ParsedData } from '@figma-config/core';
import {
  getAgenda,
  getSession,
  getSpeakers,
  searchSessions,
  getEventSummary,
} from './tools.js';

const TOOLS = [
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
];

export function createMcpServer(data: ParsedData, notice = ''): Server {
  const server = new Server(
    { name: 'figma-config-2026', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args = {} } = request.params;

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
        content = searchSessions(data, args as unknown as Parameters<typeof searchSessions>[1]);
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

    return { content: [{ type: 'text' as const, text: notice + content }] };
  });

  return server;
}
