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
import { SaleService } from '@/workflows/ventas';
import { MENSAJE_CHAMPAGNE_SIN_CONFIGURAR } from '@/lib/business/champagne';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

/**
 * Camino real de `POST /api/sales`: `SaleService.createSale` abre la unidad y
 * `registrarVenta` valida la champaña adentro, antes de escribir la cabecera.
 * Sin tramos ni máximo la venta se rechaza y la transacción no deja rastro.
 */
it('no registra una venta de champaña sin tabla de precios ni máximo configurado', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const categoriaId = crypto.randomUUID();
    const productoId = crypto.randomUUID();
    await query(
      `INSERT INTO categorias (id_categoria, nombre, estado, fecha_crea)
       VALUES (?, 'Champaña', 1, now())`,
      [categoriaId]
    );
    await query(
      `INSERT INTO productos (id_producto, codigo, nombre, categoria_id, precio, comision, fecha_crea)
       VALUES (?, ?, 'Champaña sin configurar', ?, 120000, 40000, now())`,
      [productoId, `PGCHAMP${Date.now()}`, categoriaId]
    );

    const ventasAntes = Number((await query('SELECT COUNT(*) AS total FROM ventas'))[0].total);

    await expect(
      SaleService.createSale(
        {
          total: 120000,
          sub_total: 120000,
          propina: 0,
          metodo_pago: 'efectivo',
          usuarios: [],
          detalles: [
            {
              producto_id: productoId,
              precio: 120000,
              comision: 40000,
              cantidad: 1,
              sub_total: 120000
            }
          ]
        },
        user.id_usuario
      )
    ).rejects.toThrow(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);

    const ventasDespues = Number((await query('SELECT COUNT(*) AS total FROM ventas'))[0].total);
    expect(ventasDespues).toBe(ventasAntes);
    expect(
      (await query('SELECT venta_id FROM detalle_ventas WHERE producto_id = ?', [productoId]))
        .length
    ).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('registra la venta cuando la champaña tiene máximo configurado', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const categoriaId = crypto.randomUUID();
    const productoId = crypto.randomUUID();
    await query(
      `INSERT INTO categorias (id_categoria, nombre, estado, fecha_crea)
       VALUES (?, 'Champaña', 1, now())`,
      [categoriaId]
    );
    await query(
      `INSERT INTO productos (id_producto, codigo, nombre, categoria_id, precio, comision, max_anfitrionas, fecha_crea)
       VALUES (?, ?, 'Champaña configurada', ?, 120000, 40000, 2, now())`,
      [productoId, `CHOK${Date.now().toString(36)}`, categoriaId]
    );
    let [caja] = await query(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );
    if (!caja) {
      caja = { id_caja: crypto.randomUUID() };
      await query(
        `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
             monto_cierre, efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva, comision,
             propina, anticipo, estado)
           VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
        [caja.id_caja, user.id_usuario]
      );
    }

    const sale = await SaleService.createSale(
      {
        total: 120000,
        sub_total: 120000,
        propina: 0,
        metodo_pago: 'efectivo',
        usuarios: [],
        detalles: [
          {
            producto_id: productoId,
            precio: 120000,
            comision: 40000,
            cantidad: 1,
            sub_total: 120000
          }
        ]
      },
      user.id_usuario
    );

    expect(sale.id).toBeTruthy();
    expect(
      (await query('SELECT venta_id FROM detalle_ventas WHERE producto_id = ?', [productoId]))
        .length
    ).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
