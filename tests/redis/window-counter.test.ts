import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { RedisWindowCounter } from '@/lib/cache/redisWindowCounter';

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const URL = 'redis://127.0.0.1:6379';
const CONFIG = { windowMs: 60 * 1000, threshold: 3 };

let direct: Redis;
let prefix: string;
let first: RedisWindowCounter;
let second: RedisWindowCounter;

beforeEach(async () => {
  prefix = `verification:window:${randomUUID()}:`;
  direct = new Redis(URL, { retryStrategy: () => null });
  await direct.ping();
  first = new RedisWindowCounter(URL, prefix, CONFIG);
  second = new RedisWindowCounter(URL, prefix, CONFIG);
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

it('comparte el conteo entre instancias y limpia la ventana al alcanzar el umbral', async () => {
  expect(await first.register('user-1', 'V-001')).toEqual({
    count: 1,
    items: ['V-001'],
    triggered: false
  });
  expect(await second.register('user-1', 'V-002')).toEqual({
    count: 2,
    items: ['V-001', 'V-002'],
    triggered: false
  });

  expect(await first.register('user-1', 'V-003')).toEqual({
    count: 3,
    items: ['V-001', 'V-002', 'V-003'],
    triggered: true
  });

  // El contador quedó limpio para todas las instancias, no solo para la emisora.
  expect(await second.register('user-1', 'V-004')).toEqual({
    count: 1,
    items: ['V-004'],
    triggered: false
  });
});

it('mantiene contadores separados por clave', async () => {
  await first.register('user-1', 'V-001');
  await first.register('user-1', 'V-002');

  expect(await second.register('user-2', 'V-003')).toEqual({
    count: 1,
    items: ['V-003'],
    triggered: false
  });
  expect(await second.register('user-1', 'V-004')).toMatchObject({ count: 3, triggered: true });
});

it('deja ambas claves con el TTL de la ventana', async () => {
  await first.register('user-1', 'V-001');

  const counters = await direct.keys(`${prefix}count:*`);
  const items = await direct.keys(`${prefix}items:*`);
  expect(counters).toHaveLength(1);
  expect(items).toHaveLength(1);
  expect(await direct.pttl(counters[0])).toBeGreaterThan(0);
  expect(await direct.pttl(items[0])).toBeGreaterThan(0);
});

it('arranca de cero al expirar la ventana', async () => {
  const short = new RedisWindowCounter(URL, prefix, { ...CONFIG, windowMs: 150 });
  await short.register('user-1', 'V-001');
  await short.register('user-1', 'V-002');

  await vi.waitFor(
    async () => {
      expect(await direct.keys(`${prefix}*`)).toHaveLength(0);
    },
    { timeout: 5000 }
  );

  expect(await first.register('user-1', 'V-003')).toEqual({
    count: 1,
    items: ['V-003'],
    triggered: false
  });
  short.close();
});

it('cae al contador en memoria cuando Redis no responde', async () => {
  const offline = new RedisWindowCounter('redis://127.0.0.1:6399', prefix, CONFIG);

  await offline.register('user-1', 'V-001');
  expect(await offline.register('user-1', 'V-002')).toEqual({
    count: 2,
    items: ['V-001', 'V-002'],
    triggered: false
  });
  expect(await offline.register('user-1', 'V-003')).toMatchObject({ count: 3, triggered: true });

  // El conteo vive solo en ese proceso: nada quedó escrito en el Redis compartido.
  expect(await direct.keys(`${prefix}*`)).toHaveLength(0);
  offline.close();
});
