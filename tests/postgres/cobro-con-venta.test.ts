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
import { AccountService } from '@/lib/services/AccountService';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

/** Cuenta abierta con un solo producto consumido. */
async function crearCuentaConDetalle(codigo: string, usuarioId: string) {
  const idCuenta = crypto.randomUUID();

  await query(
    `INSERT INTO cuentas (id_cuenta, codigo, cliente_id, total_comision, habitacion_id,
         sub_total, total, metodo_pago, pedido_id, servicio_id, fecha_crea, estado,
         tiempo, tiempo_actual, created_by)
     VALUES (?, ?, NULL, 1500, NULL, 12000, 12000, NULL, NULL, NULL, now(), 1, 0, 0, ?)`,
    [idCuenta, codigo, usuarioId]
  );

  return idCuenta;
}

async function agregarDetalle(cuentaId: string, productoId: string, usuarioId: string) {
  await query(
    `INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio,
         cantidad, sub_total, comision, fecha_crea, created_by)
     VALUES (?, ?, ?, 6000, 2, 12000, 1500, now(), ?)`,
    [crypto.randomUUID(), cuentaId, productoId, usuarioId]
  );
}

async function cajaAbierta(usuarioId: string) {
  const [caja] = await query<{ id_caja: string; efectivo: number; venta: number }[]>(
    'SELECT id_caja, efectivo, venta FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
  );
  if (caja) return caja;

  const idCaja = crypto.randomUUID();
  await query(
    `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
         monto_cierre, efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva, comision,
         propina, anticipo, estado)
     VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
    [idCaja, usuarioId]
  );
  return { id_caja: idCaja, efectivo: 0, venta: 0 };
}

/**
 * El cobro de cuenta y su venta eran dos requests independientes: con la cola
 * de intenciones del dispositivo eso es un fallo esperable, no un accidente.
 * Este test comprueba la promesa del endpoint en la base de verdad: los dos
 * pasos confirman juntos o revierten juntos.
 */
it('cierra la cuenta, factura y postula a caja en una sola transacción', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query<{ id_producto: string }[]>(
      'SELECT id_producto FROM productos LIMIT 1'
    );
    const caja = await cajaAbierta(user.id_usuario);
    const codigo = 'PGCOBRO';

    const idCuenta = await crearCuentaConDetalle(codigo, user.id_usuario);
    await agregarDetalle(idCuenta, product.id_producto, user.id_usuario);

    const cuenta = await AccountService.cobrarConVenta(
      idCuenta,
      { montoFinal: 12000, propinaFinal: 0, metodoPago: 'efectivo' },
      user.id_usuario
    );

    expect(cuenta?.estado).toBe(0);

    const [venta] = await query<
      {
        id_venta: string;
        total: number;
        sub_total: number;
        caja_id: string;
      }[]
    >('SELECT id_venta, total, sub_total, caja_id FROM ventas WHERE codigo = ?', [codigo]);
    expect(venta).toBeDefined();
    expect(venta.total).toBe(12000);
    expect(venta.sub_total).toBe(12000);
    // El cobro postula a caja; la venta con origen 'cuenta' no lo hace otra vez.
    expect(venta.caja_id).toBe(caja.id_caja);

    const [lineas] = await query<{ total: string }[]>(
      'SELECT COUNT(*)::text AS total FROM detalle_ventas WHERE venta_id = ?',
      [venta.id_venta]
    );
    expect(Number(lineas.total)).toBe(1);

    const [balance] = await query<{ efectivo: number; venta: number }[]>(
      'SELECT efectivo, venta FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    expect(Number(balance.venta)).toBe(Number(caja.venta) + 12000);
    expect(Number(balance.efectivo)).toBe(Number(caja.efectivo) + 12000);

    const [auditoria] = await query<{ total: string }[]>(
      'SELECT COUNT(*)::text AS total FROM ventas WHERE codigo = ?',
      [codigo]
    );
    expect(Number(auditoria.total)).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('revierte el cobro entero si la venta no se puede facturar', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const caja = await cajaAbierta(user.id_usuario);
    const codigo = 'PGCOBROSIN';

    // Cuenta sin líneas: el paso de la venta falla DESPUÉS de que el cobro ya
    // actualizó la cuenta y la caja dentro de la misma transacción.
    const idCuenta = await crearCuentaConDetalle(codigo, user.id_usuario);

    const error = await AccountService.cobrarConVenta(
      idCuenta,
      { montoFinal: 12000, propinaFinal: 0, metodoPago: 'efectivo' },
      user.id_usuario
    ).catch(caught => caught);

    expect(error).toMatchObject({ code: 'CUENTA_SIN_DETALLES' });

    // Nada quedó a medias: la cuenta sigue abierta...
    const [cuenta] = await query<{ estado: number }[]>(
      'SELECT estado FROM cuentas WHERE id_cuenta = ?',
      [idCuenta]
    );
    expect(Number(cuenta.estado)).toBe(1);

    // ...no hay venta...
    const [ventas] = await query<{ total: string }[]>(
      'SELECT COUNT(*)::text AS total FROM ventas WHERE codigo = ?',
      [codigo]
    );
    expect(Number(ventas.total)).toBe(0);

    // ...y la caja no se movió.
    const [balance] = await query<{ efectivo: number; venta: number }[]>(
      'SELECT efectivo, venta FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    expect(Number(balance.venta)).toBe(Number(caja.venta));
    expect(Number(balance.efectivo)).toBe(Number(caja.efectivo));
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('rechaza un método de pago fuera del catálogo sin tocar nada', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query<{ id_producto: string }[]>(
      'SELECT id_producto FROM productos LIMIT 1'
    );
    await cajaAbierta(user.id_usuario);
    const codigo = 'PGCOBROMP';

    const idCuenta = await crearCuentaConDetalle(codigo, user.id_usuario);
    await agregarDetalle(idCuenta, product.id_producto, user.id_usuario);

    const error = await AccountService.cobrarConVenta(
      idCuenta,
      { montoFinal: 12000, propinaFinal: 0, metodoPago: 'crypto' },
      user.id_usuario
    ).catch(caught => caught);

    expect(error).toMatchObject({ code: 'METODO_PAGO_INVALIDO' });

    const [cuenta] = await query<{ estado: number; metodo_pago: string | null }[]>(
      'SELECT estado, metodo_pago FROM cuentas WHERE id_cuenta = ?',
      [idCuenta]
    );
    expect(Number(cuenta.estado)).toBe(1);
    expect(cuenta.metodo_pago).toBeNull();
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
