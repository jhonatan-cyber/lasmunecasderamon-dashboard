import { expect, it, vi } from 'vitest';
import { RedisFailedLoginStore } from '@/lib/cache/failedLoginStore';

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const CONFIG = { windowMs: 60 * 1000, threshold: 5, lockoutMs: 60 * 1000 };

// Sin URL el store no abre conexiones: ejercita la ruta de respaldo en memoria.
const store = (overrides: Partial<typeof CONFIG> = {}) =>
  new RedisFailedLoginStore(null, 'test:', { ...CONFIG, ...overrides });

it('bloquea la cuenta al alcanzar el umbral y descuenta intentos', async () => {
  const memory = store();

  expect(await memory.register('user@test.cl')).toEqual({
    blocked: false,
    count: 1,
    remainingAttempts: 4,
    justLocked: false
  });

  for (let i = 2; i < CONFIG.threshold; i++) {
    const attempt = await memory.register('user@test.cl');
    expect(attempt.blocked).toBe(false);
    expect(attempt.remainingAttempts).toBe(CONFIG.threshold - i);
  }

  expect(await memory.register('user@test.cl')).toEqual({
    blocked: true,
    count: 5,
    remainingAttempts: 0,
    justLocked: true
  });
});

it('no vuelve a marcar el bloqueo como reciente mientras sigue vigente', async () => {
  const memory = store();
  for (let i = 0; i < CONFIG.threshold; i++) await memory.register('user@test.cl');

  const attempt = await memory.register('user@test.cl');

  expect(attempt).toEqual({ blocked: true, count: 5, remainingAttempts: 0, justLocked: false });
});

it('al expirar el bloqueo la ventana arranca de nuevo', async () => {
  const memory = store({ lockoutMs: 30 });
  for (let i = 0; i < CONFIG.threshold; i++) await memory.register('user@test.cl');
  expect((await memory.register('user@test.cl')).blocked).toBe(true);

  await new Promise(resolve => setTimeout(resolve, 40));

  expect(await memory.register('user@test.cl')).toEqual({
    blocked: false,
    count: 1,
    remainingAttempts: 4,
    justLocked: false
  });
});

it('reinicia el contador cuando expira la ventana de conteo', async () => {
  const memory = store({ windowMs: 30 });
  await memory.register('user@test.cl');
  await memory.register('user@test.cl');
  expect((await memory.register('user@test.cl')).count).toBe(3);

  await new Promise(resolve => setTimeout(resolve, 40));

  const attempt = await memory.register('user@test.cl');

  expect(attempt.count).toBe(1);
  expect(attempt.remainingAttempts).toBe(4);
});

it('trata el mismo identificador con distinto formato como uno solo', async () => {
  const memory = store();
  await memory.register('  User@Test.cl ');

  expect((await memory.register('user@test.cl')).count).toBe(2);
});

it('mantiene contadores independientes por identificador', async () => {
  const memory = store();
  for (let i = 0; i < CONFIG.threshold; i++) await memory.register('a@test.cl');

  expect(await memory.register('b@test.cl')).toEqual({
    blocked: false,
    count: 1,
    remainingAttempts: 4,
    justLocked: false
  });
});
