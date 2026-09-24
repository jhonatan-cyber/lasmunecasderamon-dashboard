import { expect, it, vi } from 'vitest';
import { RedisWindowCounter } from '@/lib/cache/redisWindowCounter';

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const CONFIG = { windowMs: 60 * 1000, threshold: 3 };

// Sin URL el contador no abre conexiones: ejercita la ruta de respaldo en memoria.
const counter = (overrides: Partial<typeof CONFIG> = {}) =>
  new RedisWindowCounter(null, 'test:', { ...CONFIG, ...overrides });

it('acumula los elementos de la ventana hasta el umbral', async () => {
  const memory = counter();

  expect(await memory.register('user-1', 'V-001')).toEqual({
    count: 1,
    items: ['V-001'],
    triggered: false
  });
  expect(await memory.register('user-1', 'V-002')).toEqual({
    count: 2,
    items: ['V-001', 'V-002'],
    triggered: false
  });
});

it('al alcanzar el umbral dispara y limpia la ventana', async () => {
  const memory = counter();
  await memory.register('user-1', 'V-001');
  await memory.register('user-1', 'V-002');

  expect(await memory.register('user-1', 'V-003')).toEqual({
    count: 3,
    items: ['V-001', 'V-002', 'V-003'],
    triggered: true
  });

  // La siguiente anulación abre una ventana nueva.
  expect(await memory.register('user-1', 'V-004')).toEqual({
    count: 1,
    items: ['V-004'],
    triggered: false
  });
});

it('mantiene contadores independientes por clave', async () => {
  const memory = counter();
  await memory.register('user-1', 'V-001');
  await memory.register('user-2', 'V-002');

  const attempt = await memory.register('user-1', 'V-003');

  expect(attempt.count).toBe(2);
  expect(attempt.items).toEqual(['V-001', 'V-003']);
});

it('reinicia el conteo cuando expira la ventana', async () => {
  const memory = counter({ windowMs: 30 });
  await memory.register('user-1', 'V-001');
  await memory.register('user-1', 'V-002');

  await new Promise(resolve => setTimeout(resolve, 40));

  expect(await memory.register('user-1', 'V-003')).toEqual({
    count: 1,
    items: ['V-003'],
    triggered: false
  });
});

it('olvida el estado local al limpiar la memoria', async () => {
  const memory = counter();
  await memory.register('user-1', 'V-001');
  expect(memory.size()).toBe(1);

  memory.clearMemory();

  expect(memory.size()).toBe(0);
  expect((await memory.register('user-1', 'V-002')).count).toBe(1);
});
