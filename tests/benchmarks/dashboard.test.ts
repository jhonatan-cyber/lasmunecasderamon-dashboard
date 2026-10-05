import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import Redis from 'ioredis';
import { RedisDashboardCache } from '@/lib/cache/redisDashboardCache';

vi.mock('@/lib/utils/logger', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger, default: logger };
});

it('measures local read-only dashboard queries and Redis hits without exposing business data', async () => {
  config({ quiet: true });
  if (!['127.0.0.1', 'localhost', '::1'].includes(process.env.DB_HOST || '127.0.0.1')) {
    throw new Error('El benchmark solo permite PostgreSQL local');
  }
  const { StatsService } = await import('@/modules/reportes/dashboard/servicio');
  const { default: database } = await import('@/lib/database/db');
  const prefix = `verification:benchmark:${randomUUID()}:`;
  const cache = new RedisDashboardCache('redis://127.0.0.1:6379', prefix);
  const direct = new Redis('redis://127.0.0.1:6379', { retryStrategy: () => null });
  try {
    expect(await direct.ping()).toBe('PONG');
    for (const [name, fetch] of [
      ['composite', () => StatsService.getDashboardComposite()],
      ['sales-by-month', () => StatsService.getSalesByMonth(0)],
      ['sales-by-week', () => StatsService.getSalesByWeek(0)],
      ['logged-users', () => StatsService.getLoggedUsers()]
    ] as const) {
      const uncached: number[] = [],
        hits: number[] = [];
      for (let i = 0; i < 3; i++) {
        await cache.invalidate();
        let start = performance.now();
        const cold = await cache.getOrFetch<unknown>(name, fetch);
        uncached.push(performance.now() - start);
        start = performance.now();
        const warm = await cache.getOrFetch(name, async () => {
          throw new Error('Cache miss');
        });
        hits.push(performance.now() - start);
        expect(warm.fromCache).toBe(true);
        expect(JSON.stringify(warm.data)).toEqual(JSON.stringify(cold.data));
      }
      console.log(
        JSON.stringify({
          endpoint: name,
          missMs: uncached.map(n => +n.toFixed(2)),
          hitMs: hits.map(n => +n.toFixed(2))
        })
      );
    }
  } finally {
    cache.close();
    let cursor = '0';
    do {
      const [next, keys] = await direct.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length) await direct.del(...keys);
    } while (cursor !== '0');
    direct.disconnect();
    await database.pool.end();
    globalThis.__lasMunecasPgPool = undefined;
  }
});
