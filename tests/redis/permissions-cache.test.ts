import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { RedisPermissionsCache } from '@/lib/auth/permissions-cache';
import type { UserPermissions } from '@/lib/middleware/auth';

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const URL = 'redis://127.0.0.1:6379';

const permissions = (overrides: Partial<UserPermissions> = {}): UserPermissions =>
  ({
    users: { read: true, write: false, delete: false },
    sales: { read: true, write: false, delete: false, anulate: false },
    ...overrides
  }) as UserPermissions;

let direct: Redis;
let prefix: string;
let first: RedisPermissionsCache;
let second: RedisPermissionsCache;

// `set` publica en Redis sin bloquear; espera a que la escritura quede visible.
const waitForSharedValue = async () => {
  await vi.waitFor(async () => {
    expect(await direct.keys(`${prefix}value:*`)).toHaveLength(1);
  });
};

beforeEach(async () => {
  prefix = `verification:perms:${randomUUID()}:`;
  direct = new Redis(URL, { retryStrategy: () => null });
  await direct.ping();
  first = new RedisPermissionsCache(URL, prefix);
  second = new RedisPermissionsCache(URL, prefix);
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

it('shares permissions between processes and propagates a per-user invalidation', async () => {
  expect(await first.read('user-1')).toBeNull();
  first.set('user-1', permissions());
  await waitForSharedValue();

  expect(await second.read('user-1')).toEqual(permissions());

  // Un proceso invalida a un usuario; el otro deja de servir el valor compartido.
  await second.invalidate('user-1');
  expect(await first.read('user-1')).toBeNull();

  // Tras la invalidación, un valor nuevo vuelve a compartirse.
  const updated = permissions({ users: { read: false, write: true, delete: false } });
  first.set('user-1', updated);
  await waitForSharedValue();
  expect(await second.read('user-1')).toEqual(updated);
});

it('clears every process at once and drops writes from a stale generation', async () => {
  expect(await first.read('user-1')).toBeNull();
  first.set('user-1', permissions());
  await waitForSharedValue();
  expect(await second.read('user-1')).toEqual(permissions());

  // Otro proceso limpia toda la caché subiendo la generación.
  await second.clear();

  // Primero escribe con la generación que observó antes del clear: debe descartarse.
  first.set('user-1', permissions({ users: { read: false, write: true, delete: false } }));

  expect(await second.read('user-1')).toBeNull();
  expect(await first.read('user-1')).toBeNull();
});

it('rotates the generation when a write happened while Redis was unavailable', async () => {
  expect(await first.read('user-1')).toBeNull();
  first.set('user-1', permissions());
  await waitForSharedValue();

  // Proceso que aún no se conecta: la invalidación queda pendiente (dirty).
  const fresh = new RedisPermissionsCache(URL, prefix);
  await fresh.invalidate('user-1');

  // Al conectar, rota la generación y descarta el valor obsoleto compartido.
  expect(await fresh.read('user-1')).toBeNull();
  expect(await first.read('user-1')).toBeNull();
  fresh.close();
});

it('falls back to memory when Redis is unavailable', async () => {
  const offline = new RedisPermissionsCache('redis://127.0.0.1:6399', prefix);
  offline.set('user-1', permissions());

  expect(await offline.read('user-1')).toEqual(permissions());
  offline.close();
});
