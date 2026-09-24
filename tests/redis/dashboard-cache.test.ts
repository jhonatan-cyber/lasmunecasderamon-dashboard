import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { RedisDashboardCache } from '@/lib/cache/redisDashboardCache';

vi.mock('@/lib/utils/logger', () => ({ logger: { warn: vi.fn() } }));
let direct: Redis;
let prefix: string;
let first: RedisDashboardCache;
let second: RedisDashboardCache;

beforeEach(async () => {
  prefix = `verification:dashboard:${randomUUID()}:`;
  direct = new Redis('redis://127.0.0.1:6379', { retryStrategy: () => null });
  await direct.ping();
  first = new RedisDashboardCache('redis://127.0.0.1:6379', prefix);
  second = new RedisDashboardCache('redis://127.0.0.1:6379', prefix);
});

afterEach(async () => {
  first.close();
  second.close();
  let cursor = '0';
  do {
    const [next, keys] = await direct.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
    cursor = next;
    if (keys.length) await direct.del(...keys);
  } while (cursor !== '0');
  direct.disconnect();
  vi.restoreAllMocks();
});

it('shares values between workers and invalidates all variants together', async () => {
  const fetch = vi.fn(async () => ({ total: 10 }));
  expect((await first.getOrFetch('summary:alice:admin', fetch)).fromCache).toBe(false);
  expect((await second.getOrFetch('summary:alice:admin', fetch)).fromCache).toBe(true);
  await second.getOrFetch('month:1', fetch);
  await first.invalidate();
  expect((await second.getOrFetch('summary:alice:admin', fetch)).fromCache).toBe(false);
  expect((await second.getOrFetch('month:1', fetch)).fromCache).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it('expires data and isolates users, roles and databases', async () => {
  await first.getOrFetch('alice:admin', async () => 'private', 30);
  expect((await second.getOrFetch('bob:admin', async () => 'bob')).data).toBe('bob');
  expect((await second.getOrFetch('alice:staff', async () => 'staff')).data).toBe('staff');
  const other = new RedisDashboardCache('redis://127.0.0.1:6379', `${prefix}other-db:`);
  try {
    expect((await other.getOrFetch('alice:admin', async () => 'other')).data).toBe('other');
  } finally {
    other.close();
  }
  await new Promise(resolve => setTimeout(resolve, 45));
  expect((await first.getOrFetch('alice:admin', async () => 'fresh')).data).toBe('fresh');
});

it('does not repopulate the current generation with a query started before invalidation', async () => {
  let finish!: (value: string) => void;
  let started!: () => void;
  const waiting = new Promise<void>(resolve => {
    started = resolve;
  });
  const inFlight = first.getOrFetch('stats', () => {
    started();
    return new Promise<string>(resolve => {
      finish = resolve;
    });
  });
  await waiting;
  await second.invalidate();
  finish('old');
  await inFlight;
  expect(await second.getOrFetch('stats', async () => 'new')).toEqual({
    data: 'new',
    fromCache: false
  });
});

it('does not cache failed queries', async () => {
  await expect(
    first.getOrFetch('stats', async () => {
      throw new Error('DB failed');
    })
  ).rejects.toThrow('DB failed');
  expect((await second.getOrFetch('stats', async () => 'recovered')).fromCache).toBe(false);
});

it('bypasses unavailable Redis and clears old data when the connection recovers', async () => {
  await first.getOrFetch('stats', async () => 'old');
  // Simulate a server rejecting commands for this connection only.
  const client = (first as unknown as { client: Redis }).client;
  const evalSpy = vi.spyOn(client, 'eval').mockRejectedValueOnce(new Error('connection lost'));
  expect(await first.getOrFetch('stats', async () => 'new')).toEqual({
    data: 'new',
    fromCache: false
  });
  await first.invalidate();
  expect(await first.getOrFetch('stats', async () => 'newer')).toEqual({
    data: 'newer',
    fromCache: false
  });
  evalSpy.mockRestore();
  const now = Date.now();
  vi.spyOn(Date, 'now').mockReturnValue(now + 5001);
  expect(await first.getOrFetch('stats', async () => 'latest')).toEqual({
    data: 'latest',
    fromCache: false
  });
  expect((await second.getOrFetch('stats', async () => 'should not fetch')).data).toBe('latest');
});
