import { expect, it, vi } from 'vitest';

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  generateUUID: () => 'uuid-test'
}));
vi.mock('@/modules/inventario/bar/consumoRepositorio', () => ({
  consumirStock: vi.fn().mockResolvedValue([])
}));

import { consumirStock } from '@/modules/inventario/bar/consumoRepositorio';
import { consumirStockBar } from '@/modules/inventario';
import { conContextoOperacionExistente } from '@/lib/transaccion/compatibilidad';

it('resuelve el contexto a la misma transacción de venta', async () => {
  const trx = vi.fn().mockResolvedValue([]);
  const detalles = [{ presentacion_id: 'presentacion-1', cantidad: 2, tipo_venta: 'shot' }];
  const contextoVenta = { usuarioId: 'usuario-1', fecha: '2026-10-04 12:00:00' };

  await conContextoOperacionExistente(trx, contexto =>
    consumirStockBar(detalles, contextoVenta, contexto)
  );

  expect(consumirStock).toHaveBeenCalledWith(trx, detalles, contextoVenta);
});
