import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { RedisFailedLoginStore } from '@/lib/auth/failed-login-store';

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const URL = 'redis://127.0.0.1:6379';
const CONFIG = { windowMs: 60 * 1000, threshold: 5, lockoutMs: 60 * 1000 };

let direct: Redis;
let prefix: string;
let first: RedisFailedLoginStore;
let second: RedisFailedLoginStore;

const attemptsBeforeLock = CONFIG.threshold - 1;

beforeEach(async () => {
  prefix = `verification:loginfail:${randomUUID()}:`;
  direct = new Redis(URL, { retryStrategy: () => null });
  await direct.ping();
  first = new RedisFailedLoginStore(URL, prefix, CONFIG);
  second = new RedisFailedLoginStore(URL, prefix, CONFIG);
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

it('comparte el bloqueo entre instancias', async () => {
  for (let i = 0; i < attemptsBeforeLock; i++) {
    expect((await first.register('user@test.cl')).blocked).toBe(false);
  }

  expect(await first.register('user@test.cl')).toEqual({
    blocked: true,
    count: 5,
    remainingAttempts: 0,
    justLocked: true
  });

  // La segunda instancia nunca contó esos intentos, pero ya ve la cuenta bloqueada.
  expect(await second.register('user@test.cl')).toEqual({
    blocked: true,
    count: 5,
    remainingAttempts: 0,
    justLocked: false
  });

  // Y no suma intentos mientras el bloqueo siga vigente.
  expect((await second.register('user@test.cl')).count).toBe(5);
});

it('deja el bloqueo con TTL y descarta el contador al bloquear', async () => {
  for (let i = 0; i < CONFIG.threshold; i++) await first.register('user@test.cl');

  const locks = await direct.keys(`${prefix}lock:*`);
  expect(locks).toHaveLength(1);
  expect(await direct.pttl(locks[0])).toBeGreaterThan(0);
  expect(await direct.keys(`${prefix}count:*`)).toHaveLength(0);
});

it('normaliza el identificador y mantiene contadores separados', async () => {
  await first.register('  User@Test.cl ');

  expect((await second.register('user@test.cl')).count).toBe(2);
  expect(await second.register('otro@test.cl')).toEqual({
    blocked: false,
    count: 1,
    remainingAttempts: 4,
    justLocked: false
  });
});

it('libera la cuenta al expirar el bloqueo', async () => {
  const short = new RedisFailedLoginStore(URL, prefix, { ...CONFIG, lockoutMs: 150 });
  for (let i = 0; i < CONFIG.threshold; i++) await short.register('user@test.cl');
  expect((await first.register('user@test.cl')).blocked).toBe(true);

  await vi.waitFor(
    async () => {
      expect(await direct.keys(`${prefix}lock:*`)).toHaveLength(0);
    },
    { timeout: 5000 }
  );

  expect(await first.register('user@test.cl')).toEqual({
    blocked: false,
    count: 1,
    remainingAttempts: 4,
    justLocked: false
  });
  short.close();
});

it('cae al contador en memoria cuando Redis no responde', async () => {
  const offline = new RedisFailedLoginStore('redis://127.0.0.1:6399', prefix, CONFIG);

  for (let i = 0; i < attemptsBeforeLock; i++) {
    expect((await offline.register('user@test.cl')).blocked).toBe(false);
  }

  expect(await offline.register('user@test.cl')).toEqual({
    blocked: true,
    count: 5,
    remainingAttempts: 0,
    justLocked: true
  });
  // El bloqueo vive solo en ese proceso: nada quedó escrito en el Redis compartido.
  expect(await direct.keys(`${prefix}*`)).toHaveLength(0);
  offline.close();
});
