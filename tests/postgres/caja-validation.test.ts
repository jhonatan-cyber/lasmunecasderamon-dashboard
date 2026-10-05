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
import { CuentaRepository } from '@/modules/operacion/cuentas/registro';
import { BusinessError } from '@/lib/errors/errors';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

/**
 * Validación server-side de caja abierta (paridad con el bloqueo de UI en
 * las 3 apps): `POST /api/sales` y `POST /cuentas/{id}/cobrar` rechazan con
 * `NO_CAJA_ABIERTA` cuando no hay caja con estado = 1. Antes de esto, la
 * venta se registraba con `caja_id` null descontando inventario sin rastro
 * en caja (hueco detectado en el smoke del 2026-09-26).
 */

const abrirCaja = async () => {
  const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
  const idCaja = crypto.randomUUID();
  await query(
    `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
         monto_cierre, efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva, comision,
         propina, anticipo, estado)
       VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
    [idCaja, user.id_usuario]
  );
  return idCaja;
};

const cerrarCajas = async () => {
  await query('UPDATE cajas SET estado = 0 WHERE estado = 1');
};

/** Cuenta mínima pendiente insertada directo (sin depender de clientes/habitaciones). */
const crearCuenta = async (createdBy: string, codigo: string) => {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO cuentas (id_cuenta, codigo, cliente_id, habitacion_id, sub_total, total,
         total_comision, propina, fecha_crea, estado, tiempo, tiempo_actual, created_by)
       VALUES (?, ?, NULL, NULL, 10000, 10000, 0, 0, now(), 1, 0, 0, ?)`,
    [id, codigo, createdBy]
  );
  return id;
};

const ventaBody = (productoId: string, total = 12000) => ({
  codigo: 'PGCAJAV',
  total,
  sub_total: total,
  metodo_pago: 'efectivo' as const,
  detalles: [{ producto_id: productoId, precio: total, cantidad: 1, sub_total: total }],
  usuarios: []
});

it('POST /sales rechaza con NO_CAJA_ABIERTA y no registra la venta sin caja', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await cerrarCajas();
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query('SELECT id_producto FROM productos LIMIT 1');
    const [ventasAntes] = await query('SELECT COUNT(*) AS n FROM ventas');

    await expect(
      SaleService.createSale(ventaBody(product.id_producto), user.id_usuario)
    ).rejects.toMatchObject({ code: 'NO_CAJA_ABIERTA' });

    const [ventasDespues] = await query('SELECT COUNT(*) AS n FROM ventas');
    expect(Number(ventasDespues.n)).toBe(Number(ventasAntes.n));
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('POST /sales con caja abierta registra la venta y postula el saldo a la caja', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await cerrarCajas();
    const idCaja = await abrirCaja();
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query('SELECT id_producto FROM productos LIMIT 1');

    const sale = await SaleService.createSale(ventaBody(product.id_producto), user.id_usuario);
    const [stored] = await query('SELECT caja_id, total FROM ventas WHERE id_venta = ?', [sale.id]);
    expect(stored.caja_id).toBe(idCaja);
    const [balance] = await query('SELECT venta FROM cajas WHERE id_caja = ?', [idCaja]);
    expect(Number(balance.venta)).toBe(12000);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('cobrar cuenta rechaza con NO_CAJA_ABIERTA y deja la cuenta pendiente', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await cerrarCajas();
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const cuentaId = await crearCuenta(user.id_usuario, 'PGCAJAC');

    await expect(
      CuentaRepository.cobrar(
        cuentaId,
        { montoFinal: 10000, metodoPago: 'efectivo' },
        user.id_usuario
      )
    ).rejects.toMatchObject({ code: 'NO_CAJA_ABIERTA' });

    const [row] = await query('SELECT estado FROM cuentas WHERE id_cuenta = ?', [cuentaId]);
    expect(Number(row.estado)).toBe(1); // sigue pendiente, no cobrada
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('cobrar cuenta con caja abierta cobra y postula monto + propina a la caja', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await cerrarCajas();
    const idCaja = await abrirCaja();
    const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
    const cuentaId = await crearCuenta(user.id_usuario, 'PGCAJAC2');

    await CuentaRepository.cobrar(
      cuentaId,
      { montoFinal: 10000, propinaFinal: 1000, metodoPago: 'efectivo' },
      user.id_usuario
    );

    const [row] = await query('SELECT estado FROM cuentas WHERE id_cuenta = ?', [cuentaId]);
    expect(Number(row.estado)).toBe(0);
    const [balance] = await query('SELECT venta, propina, efectivo FROM cajas WHERE id_caja = ?', [
      idCaja
    ]);
    expect(Number(balance.venta)).toBe(10000);
    expect(Number(balance.propina)).toBe(1000);
    expect(Number(balance.efectivo)).toBe(11000);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
