import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createMcpServer } from '../src/server.js';
import type { ParsedData } from '@figma-config/core';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load static data once — committed to repo, no scraping needed
const data = JSON.parse(
  readFileSync(join(__dirname, '../data/data.json'), 'utf-8'),
) as ParsedData;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createMcpServer(data);
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  await server.close();
}
