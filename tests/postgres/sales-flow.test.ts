import { afterAll, expect, it, vi } from 'vitest';
vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));
vi.mock('@/lib/services/SecurityAlertService', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));
import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { OrderRepository } from '@/lib/repositories/OrderRepository';
import { SaleService } from '@/lib/services/SaleService';
import { SaleRepository } from '@/lib/repositories/SaleRepository';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('creates an order, records its sale and posts the cash balance using the actual services', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query('SELECT id_producto FROM productos LIMIT 1');
    const [caja] = await query(
      'SELECT id_caja, efectivo, venta FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );
    expect(caja).toBeDefined();
    const order = await OrderRepository.create({
      codigo: 'PGORDER',
      meseroId: user.id_usuario,
      subtotal: 12000,
      total: 12000,
      detalles: [
        {
          productoId: product.id_producto,
          precio: 6000,
          cantidad: 2,
          subtotal: 12000,
          generaComision: 0
        }
      ]
    });
    expect((await OrderRepository.getDetail(order.id)).length).toBeGreaterThan(0);
    expect((await OrderRepository.getAll()).find(row => row.id === order.id)?.cliente_nombre).toBe(
      'Sin cliente registrado'
    );
    const sale = await SaleService.createSale(
      {
        codigo: 'PGSALE',
        pedido_id: order.id,
        total: 12000,
        sub_total: 12000,
        metodo_pago: 'efectivo',
        detalles: [
          { producto_id: product.id_producto, precio: 6000, cantidad: 2, sub_total: 12000 }
        ]
      },
      user.id_usuario
    );
    expect(sale.total).toBe(12000);
    const [stored] = await query(
      'SELECT total, pedido_id, caja_id FROM ventas WHERE id_venta = ?',
      [sale.id]
    );
    expect(stored).toEqual({ total: 12000, pedido_id: order.id, caja_id: caja.id_caja });
    const [balance] = await query('SELECT efectivo, venta FROM cajas WHERE id_caja = ?', [
      caja.id_caja
    ]);
    expect(balance.efectivo).toBe(Number(caja.efectivo) + 12000);
    expect(balance.venta).toBe(Number(caja.venta) + 12000);
    expect(await SaleRepository.getById(sale.id)).not.toBeNull();
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
