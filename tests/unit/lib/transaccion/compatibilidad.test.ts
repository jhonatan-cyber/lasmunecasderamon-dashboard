import { expect, it, vi } from 'vitest';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { conContextoOperacionExistente } from '@/lib/transaccion/compatibilidad';

it('libera el contexto opaco al terminar la operación heredada', async () => {
  const trx = vi.fn();
  let contexto: { id: string } | undefined;

  await conContextoOperacionExistente(trx, async actual => {
    contexto = actual;
    expect(Object.keys(actual)).toEqual(['id']);
    expect(resolverTransaccion(actual)).toBe(trx);
  });

  expect(() => resolverTransaccion(contexto!)).toThrow(/no tiene transacción resoluble/);
});
