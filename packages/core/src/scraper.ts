import { join } from 'node:path';
import { getCached, setCached, CACHE_DIR } from './cache.js';

const ALLOWED_PATHS = ['/session/', '/event/', '/speakers/', '/agenda/', '/sponsors/', '/faq/'];
const USER_AGENT = 'figma-config-llms-txt/1.0 (+https://github.com/figma-config/llms-txt)';
const FALLBACK_URLS = [
  'https://config.figma.com/san-francisco/agenda/',
  'https://config.figma.com/san-francisco/speakers/',
  'https://config.figma.com/san-francisco/faq/',
  'https://config.figma.com/san-francisco/sponsors/',
];

export interface ScrapeOptions {
  delay?: number;
  cacheOnly?: boolean;
  refresh?: boolean;
  only?: string[]; // path segments to include, e.g. ['sessions', 'events']
}

export type ProgressCallback = (url: string, index: number, total: number) => void;

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  const backoffs = [2000, 4000, 8000];
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries) throw err;
      await sleep(backoffs[i] ?? 8000);
    }
  }
  throw new Error('unreachable');
}

export async function fetchSitemap(event: string): Promise<string[]> {
  try {
    const xml = await fetchWithRetry('https://config.figma.com/sitemap.xml');
    const urls: string[] = [];
    for (const m of xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)) {
      const url = m[1];
      if (url && url.includes(`/${event}/`) && ALLOWED_PATHS.some(p => url.includes(p))) {
        urls.push(url);
      }
    }
    return urls.length > 0 ? urls : FALLBACK_URLS;
  } catch {
    return FALLBACK_URLS;
  }
}

export async function fetchPage(url: string, opts: ScrapeOptions = {}): Promise<string> {
  const { cacheOnly = false, refresh = false } = opts;
  if (!refresh) {
    const cached = await getCached(url);
    if (cached) return cached;
  }
  if (cacheOnly) throw new Error(`Cache miss (--cache-only): ${url}`);
  const html = await fetchWithRetry(url);
  await setCached(url, html);
  return html;
}

export async function scrapeAll(
  urls: string[],
  opts: ScrapeOptions = {},
  onProgress?: ProgressCallback,
): Promise<Map<string, string>> {
  const { delay = 1000 } = opts;
  const results = new Map<string, string>();
  const errors: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    onProgress?.(url, i, urls.length);
    try {
      results.set(url, await fetchPage(url, opts));
    } catch (err) {
      errors.push(`${url}: ${String(err)}`);
    }
    if (i < urls.length - 1) await sleep(delay);
  }

  if (errors.length > 0) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(CACHE_DIR, 'error.log'), errors.join('\n'), 'utf-8').catch(() => {});
  }

  return results;
}
