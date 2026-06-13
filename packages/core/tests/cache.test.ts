import { describe, it, expect, afterAll } from 'vitest';
import { getCached, setCached, isCacheStale, clearCache } from '../src/cache.js';

const KEY = `test-cache-${process.pid}`;

afterAll(async () => {
  await clearCache();
});

describe('getCached', () => {
  it('returns null for a key that has never been set', async () => {
    expect(await getCached('__nonexistent_key_xyz__')).toBeNull();
  });
});

describe('setCached / getCached round-trip', () => {
  it('stores and retrieves a string value', async () => {
    await setCached(KEY, 'hello figma');
    expect(await getCached(KEY)).toBe('hello figma');
  });

  it('overwrites an existing value', async () => {
    await setCached(KEY, 'v1');
    await setCached(KEY, 'v2');
    expect(await getCached(KEY)).toBe('v2');
  });
});

describe('isCacheStale', () => {
  it('returns true for a missing key', async () => {
    expect(await isCacheStale('__nonexistent_stale_xyz__')).toBe(true);
  });

  it('returns false immediately after setCached', async () => {
    await setCached(KEY + '-stale', 'fresh');
    expect(await isCacheStale(KEY + '-stale')).toBe(false);
  });
});

describe('clearCache', () => {
  it('makes previously cached values unavailable', async () => {
    await setCached(KEY + '-clear', 'data');
    await clearCache();
    expect(await getCached(KEY + '-clear')).toBeNull();
  });
});
