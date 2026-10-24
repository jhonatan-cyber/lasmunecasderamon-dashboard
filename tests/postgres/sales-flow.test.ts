import { afterAll, expect, it, vi } from 'vitest';
vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));
vi.mock('@/modules/auditoria/alertas/servicio', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));
import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { OrderRepository } from '@/modules/operacion/pedidos/repositorio';
import { SaleService } from '@/workflows/ventas';
import { SaleService as SaleRepository } from '@/workflows/ventas';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('creates an order, records its sale and posts the cash balance using the actual services', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const product = { id_producto: crypto.randomUUID() };
    await query(
      'INSERT INTO productos (id_producto, codigo, nombre, precio, comision, fecha_crea) VALUES (?, ?, ?, 6000, 0, now())',
      [product.id_producto, 'PGORDERFIX', 'Producto pedido completo']
    );
    // El volcado base puede no traer caja abierta: el test la abre para poder postular
    // los saldos (el snapshot la revierte al terminar).
    let [caja] = await query(
      'SELECT id_caja, efectivo, tarjeta, propina, venta FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );
    if (!caja) {
      const idCaja = crypto.randomUUID();
      await query(
        `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
             monto_cierre, efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva, comision,
             propina, anticipo, estado)
           VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
        [idCaja, user.id_usuario]
      );
      caja = { id_caja: idCaja, efectivo: 0, tarjeta: 0, propina: 0, venta: 0 };
    }
    const order = await OrderRepository.create({
      metodoPago: 'efectivo',
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
    // El cajero cobra con tarjeta y una propina distinta a la guardada en el
    // pedido: el pago y los importes que manda la caja no se descartan, pero lo
    // vendido (productos, cantidades y precios) sigue saliendo del pedido.
    const payload = {
      pedido_id: order.id,
      cliente_id: null,
      metodo_pago: 'tarjeta' as const,
      propina: 2000,
      total: 1,
      sub_total: 1,
      origen: 'cuenta',
      skip_client_prepago: true,
      habitacion_id: crypto.randomUUID(),
      tiempo: 90,
      detalles: [{ producto_id: crypto.randomUUID(), precio: 1, cantidad: 1, sub_total: 1 }]
    };
    // A failed confirmation leaves the order pending, without partial sales.
    await query('UPDATE cajas SET estado = 0 WHERE estado = 1');
    await expect(SaleService.createSale(payload, user.id_usuario)).rejects.toThrow('caja abierta');
    expect(
      (await query('SELECT estado FROM pedidos WHERE id_pedido = ?', [order.id]))[0].estado
    ).toBe(1);
    expect(
      (await query('SELECT id_venta FROM ventas WHERE pedido_id = ?', [order.id])).length
    ).toBe(0);
    await query('UPDATE cajas SET estado = 1 WHERE id_caja = ?', [caja.id_caja]);
    // Two concurrent confirmations consume the saved snapshot exactly once.
    const attempts = await Promise.allSettled([
      SaleService.createSale(payload, user.id_usuario),
      SaleService.createSale(payload, user.id_usuario)
    ]);
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter(r => r.status === 'rejected')).toHaveLength(1);
    const sale = (attempts.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>)
      .value;
    const [saved] = await query(
      'SELECT metodo_pago, propina, habitacion_id, tiempo FROM ventas WHERE id_venta = ?',
      [sale.id]
    );
    expect(saved).toMatchObject({
      metodo_pago: 'tarjeta',
      propina: 2000,
      habitacion_id: null,
      tiempo: 0
    });
    const [savedDetail] = await query(
      'SELECT producto_id, cantidad, precio FROM detalle_ventas WHERE venta_id = ?',
      [sale.id]
    );
    expect(savedDetail).toMatchObject({
      producto_id: product.id_producto,
      cantidad: 2,
      precio: 6000
    });
    expect(sale.total).toBe(14000);
    const [stored] = await query(
      'SELECT total, pedido_id, caja_id FROM ventas WHERE id_venta = ?',
      [sale.id]
    );
    expect(stored).toEqual({ total: 14000, pedido_id: order.id, caja_id: caja.id_caja });
    const [balance] = await query(
      'SELECT efectivo, tarjeta, propina, venta FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    expect(balance.efectivo).toBe(Number(caja.efectivo));
    expect(balance.tarjeta).toBe(Number(caja.tarjeta) + 14000);
    expect(balance.propina).toBe(Number(caja.propina) + 2000);
    expect(balance.venta).toBe(Number(caja.venta) + 12000);
    expect(await SaleRepository.getById(sale.id)).not.toBeNull();
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('conserva la habitacion del pedido y permite al cajero ajustar solo su tiempo a 90 minutos', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const roomId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    await query(
      'INSERT INTO productos (id_producto, codigo, nombre, precio, comision, fecha_crea) VALUES (?, ?, ?, 10000, 0, now())',
      [productId, 'PGROOMORDER', 'Pedido habitacion']
    );
    await query(
      'INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea) VALUES (?, ?, 10000, 30, 1000, 1, now())',
      [roomId, 'Privado pedido fijo']
    );
    let [caja] = await query('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
    if (!caja) {
      caja = { id_caja: crypto.randomUUID() };
      await query(
        `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
             monto_cierre, efectivo, tarjeta, estado)
           VALUES (?, now(), ?, 0, 0, 0, 0, 1)`,
        [caja.id_caja, user.id_usuario]
      );
    }
    const order = await OrderRepository.create({
      codigo: 'PGROOMORD',
      meseroId: user.id_usuario,
      metodoPago: 'efectivo',
      subtotal: 10000,
      total: 10000,
      detalles: [
        {
          productoId: productId,
          precio: 10000,
          cantidad: 1,
          subtotal: 10000,
          roomId,
          generaComision: 0
        }
      ]
    });
    const payload = {
      pedido_id: order.id,
      total: 1,
      detalles: [{ producto_id: productId, precio: 1, cantidad: 1 }],
      habitacion_id: crypto.randomUUID(),
      tiempo: 0
    };
    await expect(SaleService.createSale(payload, user.id_usuario)).rejects.toThrow('tiempo');
    const sale = await SaleService.createSale({ ...payload, tiempo: 90 }, user.id_usuario);
    expect(
      (
        await query('SELECT habitacion_id, tiempo, total FROM ventas WHERE id_venta = ?', [sale.id])
      )[0]
    ).toMatchObject({ habitacion_id: roomId, tiempo: 90, total: 10000 });
    expect(
      (await query('SELECT estado FROM habitaciones WHERE id_habitacion = ?', [roomId]))[0].estado
    ).toBe(2);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
