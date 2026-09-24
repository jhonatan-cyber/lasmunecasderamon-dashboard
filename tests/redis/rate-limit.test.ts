import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, connect, type Socket } from 'node:net';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

// Isolate failures behind a TCP relay; never stop or flush the user's Redis.
const sockets = new Set<Socket>();
let relay: ReturnType<typeof createServer>;
let direct: Redis;
let port: number;
let prefix: string;
const path = '/api/redis-verification';
const ip = '127.0.0.1';
const request = () =>
  new NextRequest(`http://localhost${path}`, {
    headers: { 'x-forwarded-for': ip }
  });
const key = () => `rl:${prefix}:${ip}:${path}`;
const config = () => ({ prefix, max: 2, windowMs: 10000 });

async function listen() {
  await new Promise<void>(resolve => relay.listen(port || 0, '127.0.0.1', resolve));
  port = (relay.address() as { port: number }).port;
}

async function outage() {
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve, reject) => relay.close(err => (err ? reject(err) : resolve())));
}

beforeEach(async () => {
  vi.resetModules();
  prefix = `verification:${randomUUID()}`;
  // Explicit local-only test target. No application credentials or remote URL.
  direct = new Redis({
    host: '127.0.0.1',
    port: 6379,
    lazyConnect: true,
    retryStrategy: () => null,
    connectTimeout: 2000
  });
  direct.on('error', () => {});
  await direct.connect();
  expect(await direct.ping()).toBe('PONG');
  relay = createServer(client => {
    const upstream = connect(6379, '127.0.0.1');
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on('error', () => {
        client.destroy();
        upstream.destroy();
      });
      socket.on('close', () => {
        sockets.delete(socket);
        client.destroy();
        upstream.destroy();
      });
    }
    client.pipe(upstream).pipe(client);
  });
  port = 0;
  await listen();
  vi.stubEnv('REDIS_URL', `redis://127.0.0.1:${port}`);
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  if (relay?.listening) await outage();
  if (direct?.status === 'ready') await direct.del(key());
  direct?.disconnect();
});

describe('rate limiting with real Redis', () => {
  it('counts concurrent requests atomically, expires keys and returns HTTP 429', async () => {
    const { checkRateLimit, withRedisRateLimit } = await import('@/lib/middleware/redisRateLimit');
    const results = await Promise.all(
      Array.from({ length: 8 }, () => checkRateLimit(request(), config()))
    );
    expect(results.filter(result => result?.allowed)).toHaveLength(2);
    expect(await direct.get(key())).toBe('8');
    expect(await direct.ttl(key())).toBeGreaterThan(0);
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const response = await withRedisRateLimit(config())(request(), handler);
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(handler).not.toHaveBeenCalled();
    await direct.pexpire(key(), 1);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(true);
    expect(await direct.get(key())).toBe('1');
  });

  it('limits in memory after initial failure, isolates policies and recovers without restart', async () => {
    await outage();
    const { checkRateLimit } = await import('@/lib/middleware/redisRateLimit');
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(true);
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(true);
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(false);
    expect(
      (await checkRateLimit(request(), { ...config(), prefix: 'another-policy' }))?.allowed
    ).toBe(true);
    await listen();
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(false);
    expect(await direct.get(key())).toBeNull();
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 5001);
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(true);
    expect(await direct.get(key())).toBe('1');
  });

  it('falls back during a connection loss and reconnects on a later request', async () => {
    const { checkRateLimit } = await import('@/lib/middleware/redisRateLimit');
    await checkRateLimit(request(), config());
    await outage();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(true);
    await listen();
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 5001);
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(true);
    expect(await direct.get(key())).toBe('2');
  });

  it('uses memory when Redis rejects the counter command', async () => {
    await direct.set(key(), 'invalid-counter', 'EX', 30);
    const { checkRateLimit } = await import('@/lib/middleware/redisRateLimit');
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(true);
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(true);
    expect((await checkRateLimit(request(), config()))?.allowed).toBe(false);
    expect(await direct.get(key())).toBe('invalid-counter');
  });
});
