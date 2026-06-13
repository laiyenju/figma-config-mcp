import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getCached, isCacheStale, setCached, buildData } from '@figma-config/core';
import type { ParsedData } from '@figma-config/core';
import { createMcpServer } from './server.js';

const DATA_CACHE_KEY = 'data.json';
const DEFAULT_EVENT = 'san-francisco';
const COLD_START_NOTICE =
  '_Note: Figma Config 2026 data was just scraped for the first time (or after a 24-hour refresh). Future tool calls will be instant._\n\n---\n\n';

interface LoadResult {
  data: ParsedData;
  freshlyScraped: boolean;
}

let scrapePromise: Promise<LoadResult> | null = null;

async function loadData(): Promise<LoadResult> {
  // Fast path: a scrape is already running — share it instead of starting a second one
  if (scrapePromise) return scrapePromise;

  const stale = await isCacheStale(DATA_CACHE_KEY);
  if (!stale) {
    const raw = await getCached(DATA_CACHE_KEY);
    if (raw) {
      try {
        return { data: JSON.parse(raw) as ParsedData, freshlyScraped: false };
      } catch {
        // Corrupted cache — fall through to re-scrape
      }
    }
  }

  // Re-check after awaits: another call may have started scraping while we waited
  if (scrapePromise) return scrapePromise;

  console.error('[figma-config-mcp] Cache cold or expired — scraping Figma Config 2026 (~90s)…');
  scrapePromise = buildData(DEFAULT_EVENT)
    .then(async data => {
      await setCached(DATA_CACHE_KEY, JSON.stringify(data));
      console.error('[figma-config-mcp] Scrape complete.');
      return { data, freshlyScraped: true };
    })
    .finally(() => {
      scrapePromise = null;
    });

  return scrapePromise;
}

const { data, freshlyScraped } = await loadData();
const server = createMcpServer(data, freshlyScraped ? COLD_START_NOTICE : '');
const transport = new StdioServerTransport();
await server.connect(transport);
