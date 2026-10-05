import { cobrarCuentaConVenta } from '@/workflows/cobrar-cuenta';
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
import * as conceptos from '@/modules/personal/conceptos/repositorio';
import { sendNotificationToAll } from '@/lib/api/sseService';

vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));

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

    const cuenta = await cobrarCuentaConVenta(
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
    await expect(
      cobrarCuentaConVenta(
        idCuenta,
        { montoFinal: 12000, propinaFinal: 0, metodoPago: 'efectivo' },
        user.id_usuario
      )
    ).rejects.toMatchObject({ code: 'CUENTA_YA_PROCESADA' });
    const [reintento] = await query<{ efectivo: number }[]>(
      'SELECT efectivo FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    expect(Number(reintento.efectivo)).toBe(Number(caja.efectivo) + 12000);
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

    const error = await cobrarCuentaConVenta(
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

    const error = await cobrarCuentaConVenta(
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

it('confirma la propina junto con la venta aunque falle un aviso posterior', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query<{ id_producto: string }[]>(
      'SELECT id_producto FROM productos LIMIT 1'
    );
    const caja = await cajaAbierta(user.id_usuario);
    const id = await crearCuentaConDetalle('PGPROPINA', user.id_usuario);
    await agregarDetalle(id, product.id_producto, user.id_usuario);
    vi.mocked(sendNotificationToAll).mockImplementationOnce(() => {
      throw new Error('SSE no disponible');
    });
    const cuenta = await cobrarCuentaConVenta(
      id,
      { montoFinal: 12000, propinaFinal: 1000, metodoPago: 'efectivo' },
      user.id_usuario
    );
    expect(cuenta?.estado).toBe(0);
    const [propina] = await query<{ propina: number }[]>(
      'SELECT p.propina FROM propinas p JOIN ventas v ON v.id_venta = p.venta_id WHERE v.codigo = ?',
      ['PGPROPINA']
    );
    expect(Number(propina.propina)).toBe(1000);
    const [balance] = await query<{ efectivo: number; venta: number }[]>(
      'SELECT efectivo, venta FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    expect(Number(balance.efectivo)).toBe(Number(caja.efectivo) + 13000);
    expect(Number(balance.venta)).toBe(Number(caja.venta) + 12000);
  } finally {
    vi.mocked(sendNotificationToAll).mockReset();
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('un fallo al registrar propina revierte venta, cuenta, caja y auditoria sin avisos', async () => {
  const snapshot = await snapshotDatabase();
  const fallo = vi
    .spyOn(conceptos, 'insertarPropina')
    .mockRejectedValueOnce(new Error('Fallo posterior a la venta'));
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query<{ id_producto: string }[]>(
      'SELECT id_producto FROM productos LIMIT 1'
    );
    const caja = await cajaAbierta(user.id_usuario);
    const [auditoriaAntes] = await query<{ n: string }[]>(
      'SELECT COUNT(*)::text AS n FROM audit_logs'
    );
    const id = await crearCuentaConDetalle('PGROLLBACKPROP', user.id_usuario);
    await agregarDetalle(id, product.id_producto, user.id_usuario);
    vi.mocked(sendNotificationToAll).mockClear();
    await expect(
      cobrarCuentaConVenta(
        id,
        { montoFinal: 12000, propinaFinal: 1000, metodoPago: 'efectivo' },
        user.id_usuario
      )
    ).rejects.toThrow('Fallo posterior a la venta');
    const [cuenta] = await query<{ estado: number }[]>(
      'SELECT estado FROM cuentas WHERE id_cuenta = ?',
      [id]
    );
    expect(cuenta.estado).toBe(1);
    const ventas = await query('SELECT id_venta FROM ventas WHERE codigo = ?', ['PGROLLBACKPROP']);
    expect(ventas).toEqual([]);
    const [balance] = await query<{ efectivo: number; venta: number }[]>(
      'SELECT efectivo, venta FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    expect(Number(balance.efectivo)).toBe(Number(caja.efectivo));
    expect(Number(balance.venta)).toBe(Number(caja.venta));
    const [auditoriaDespues] = await query<{ n: string }[]>(
      'SELECT COUNT(*)::text AS n FROM audit_logs'
    );
    expect(auditoriaDespues.n).toBe(auditoriaAntes.n);
    expect(sendNotificationToAll).not.toHaveBeenCalled();
  } finally {
    fallo.mockRestore();
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('descuenta prepago una vez y la venta no vuelve a debitar al cliente', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query<{ id_producto: string }[]>(
      'SELECT id_producto FROM productos LIMIT 1'
    );
    const caja = await cajaAbierta(user.id_usuario);
    const [antes] = await query<{ prepago: number }[]>(
      'SELECT prepago FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    const clienteId = crypto.randomUUID();
    await query(
      'INSERT INTO clientes (id_cliente, nombre, apellido, fecha_crea, saldo) VALUES (?, ?, ?, now(), ?)',
      [clienteId, 'Fixture', 'Prepago', 20000]
    );
    const id = await crearCuentaConDetalle('PGPREPAGO', user.id_usuario);
    await query('UPDATE cuentas SET cliente_id = ? WHERE id_cuenta = ?', [clienteId, id]);
    await agregarDetalle(id, product.id_producto, user.id_usuario);
    await cobrarCuentaConVenta(
      id,
      { montoFinal: 12000, propinaFinal: 1000, metodoPago: 'prepago' },
      user.id_usuario
    );
    const [cliente] = await query<{ saldo: number }[]>(
      'SELECT saldo FROM clientes WHERE id_cliente = ?',
      [clienteId]
    );
    expect(Number(cliente.saldo)).toBe(7000);
    const [despues] = await query<{ prepago: number }[]>(
      'SELECT prepago FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    expect(Number(despues.prepago)).toBe(Number(antes.prepago) + 13000);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('restaura el saldo prepago si falla la propina al final de la unidad', async () => {
  const snapshot = await snapshotDatabase();
  const fallo = vi
    .spyOn(conceptos, 'insertarPropina')
    .mockRejectedValueOnce(new Error('Fallo tardio'));
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const [product] = await query<{ id_producto: string }[]>(
      'SELECT id_producto FROM productos LIMIT 1'
    );
    const caja = await cajaAbierta(user.id_usuario);
    const [antes] = await query<{ prepago: number }[]>(
      'SELECT prepago FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    const clienteId = crypto.randomUUID();
    await query(
      'INSERT INTO clientes (id_cliente, nombre, apellido, fecha_crea, saldo) VALUES (?, ?, ?, now(), ?)',
      [clienteId, 'Fixture', 'Rollback', 20000]
    );
    const id = await crearCuentaConDetalle('PGPREPAGOFALLO', user.id_usuario);
    await query('UPDATE cuentas SET cliente_id = ? WHERE id_cuenta = ?', [clienteId, id]);
    await agregarDetalle(id, product.id_producto, user.id_usuario);
    await expect(
      cobrarCuentaConVenta(
        id,
        { montoFinal: 12000, propinaFinal: 1000, metodoPago: 'prepago' },
        user.id_usuario
      )
    ).rejects.toThrow('Fallo tardio');
    const [cliente] = await query<{ saldo: number }[]>(
      'SELECT saldo FROM clientes WHERE id_cliente = ?',
      [clienteId]
    );
    expect(Number(cliente.saldo)).toBe(20000);
    const [despues] = await query<{ prepago: number }[]>(
      'SELECT prepago FROM cajas WHERE id_caja = ?',
      [caja.id_caja]
    );
    expect(Number(despues.prepago)).toBe(Number(antes.prepago));
  } finally {
    fallo.mockRestore();
    await restoreDatabase(snapshot, 'test-only');
  }
});
