import { expect, it, vi } from 'vitest';
import { listarPresentacionesParaReposicion } from '@/modules/inventario/reposicion/repositorio';
import type { TransactionQuery } from '@/lib/database/db';

it('excluye las presentaciones desactivadas del cálculo de reposición', async () => {
  const trx = vi.fn(async () => []) as unknown as TransactionQuery;

  await expect(listarPresentacionesParaReposicion(trx, '2026-11-26')).resolves.toEqual([]);

  expect(trx).toHaveBeenCalledWith(expect.stringContaining('p.activa = true'), [
    '2026-11-26',
    '2026-11-26',
    '2026-11-26'
  ]);
});
