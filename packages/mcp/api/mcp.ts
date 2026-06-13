import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ParsedData } from '@yenlai/figma-config-core';
import { TOOLS } from '../src/server.js';
import {
  getAgenda,
  getSession,
  getSpeakers,
  searchSessions,
  getEventSummary,
} from '../src/tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const data = JSON.parse(
  readFileSync(join(__dirname, '../data/data.json'), 'utf-8'),
) as ParsedData;

function ok(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

function rpcErr(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  const body = req.body as {
    id?: unknown;
    method?: string;
    params?: Record<string, unknown>;
  };

  const { id, method, params = {} } = body;

  // JSON-RPC notifications have no id — acknowledge without a response body
  if (id === undefined || id === null) {
    res.status(202).end();
    return;
  }

  switch (method) {
    case 'initialize':
      res.json(ok(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'figma-config-2026', version: '1.0.0' },
      }));
      return;

    case 'ping':
      res.json(ok(id, {}));
      return;

    case 'tools/list':
      res.json(ok(id, { tools: TOOLS }));
      return;

    case 'tools/call': {
      const { name, arguments: args = {} } = params as {
        name: string;
        arguments?: Record<string, unknown>;
      };

      let text: string;
      try {
        switch (name) {
          case 'get_agenda':
            text = getAgenda(data, args as Parameters<typeof getAgenda>[1]);
            break;
          case 'get_session':
            text = getSession(data, args as Parameters<typeof getSession>[1]);
            break;
          case 'get_speakers':
            text = getSpeakers(data, args as Parameters<typeof getSpeakers>[1]);
            break;
          case 'search_sessions':
            text = searchSessions(data, args as unknown as Parameters<typeof searchSessions>[1]);
            break;
          case 'get_event_summary':
            text = getEventSummary(data);
            break;
          default:
            res.json(rpcErr(id, -32601, `Unknown tool: ${name}`));
            return;
        }
      } catch (e) {
        res.json(rpcErr(id, -32603, `Tool error: ${e instanceof Error ? e.message : String(e)}`));
        return;
      }

      res.json(ok(id, { content: [{ type: 'text', text }] }));
      return;
    }

    default:
      res.json(rpcErr(id, -32601, `Method not found: ${method}`));
  }
}
