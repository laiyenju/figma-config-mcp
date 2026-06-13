import cacache from 'cacache';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const CACHE_DIR = join(homedir(), '.cache', 'figma-config');
const TTL_MS = 24 * 60 * 60 * 1000;

export async function getCached(key: string): Promise<string | null> {
  try {
    const info = await cacache.get.info(CACHE_DIR, key);
    if (!info) return null;
    if (Date.now() - info.time > TTL_MS) return null;
    const result = await cacache.get(CACHE_DIR, key);
    return result.data.toString('utf-8');
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: string): Promise<void> {
  await cacache.put(CACHE_DIR, key, value);
}

export async function isCacheStale(key: string): Promise<boolean> {
  try {
    const info = await cacache.get.info(CACHE_DIR, key);
    if (!info) return true;
    return Date.now() - info.time > TTL_MS;
  } catch {
    return true;
  }
}

export async function clearCache(): Promise<void> {
  await cacache.rm.all(CACHE_DIR);
}
