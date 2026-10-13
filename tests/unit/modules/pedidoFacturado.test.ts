import { describe, expect, it, vi } from 'vitest';
import { cerrarPedidoFacturado } from '@/modules/operacion/facturacion/repositorio';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';

vi.mock('@/lib/transaccion/infraestructura', () => ({ resolverTransaccion: vi.fn() }));

describe('Facturación del pedido dentro de la transacción de venta', () => {
  it('cierra únicamente un pedido pendiente', async () => {
    const query = vi.fn().mockResolvedValue([{ id_pedido: 'pedido' }]);
    vi.mocked(resolverTransaccion).mockReturnValue(query);
    await expect(
      cerrarPedidoFacturado('pedido', { id: 'transaction' } as any)
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('AND estado = 1 RETURNING'), [
      'pedido'
    ]);
  });

  it('rechaza un segundo cobro para que se revierta la venta y el inventario', async () => {
    vi.mocked(resolverTransaccion).mockReturnValue(vi.fn().mockResolvedValue([]));
    await expect(
      cerrarPedidoFacturado('pedido', { id: 'transaction' } as any)
    ).rejects.toMatchObject({
      code: 'ORDER_ALREADY_PROCESSED'
    });
  });
});
