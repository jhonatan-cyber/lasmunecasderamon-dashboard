/**
 * Recarga y devolución de prepago sobre APIs públicas, contra la base real.
 *
 * Cubre el camino migrado en el corte 18: la recarga postula caja, suma saldo
 * y abre su cuenta PREP-* en una sola unidad; la devolución descuenta sin
 * tocar caja y cierra las PREP-* al saldar.
 */
import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(async () => undefined),
  sendPushNotification: vi.fn(async () => undefined)
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { ClientService } from '@/lib/services/ClientService';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function abrirCajaConEfectivo(monto: number): Promise<string> {
  const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
         monto_cierre, efectivo, tarjeta, transferencia, venta, servicio, cargo_tarjeta, iva, comision,
         propina, anticipo, estado)
       VALUES (?, now(), ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
    [id, user.id_usuario, monto]
  );
  return id;
}

async function clienteEnCero(): Promise<{ clienteId: string; usuarioId: string }> {
  const [cliente] = await query<{ id_cliente: string }[]>(
    'SELECT id_cliente FROM clientes LIMIT 1'
  );
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios LIMIT 1'
  );
  await query('UPDATE clientes SET saldo = 0 WHERE id_cliente = ?', [cliente.id_cliente]);
  return { clienteId: cliente.id_cliente, usuarioId: usuario.id_usuario };
}

async function saldoDe(clienteId: string): Promise<number> {
  const [row] = await query<{ saldo: number }[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ?',
    [clienteId]
  );
  return Number(row.saldo);
}

it('la recarga suma saldo, postula caja y abre cuenta PREP', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await abrirCajaConEfectivo(50000);
    const { clienteId, usuarioId } = await clienteEnCero();
    const [cajaAntes] = await query<Record<string, number>[]>(
      'SELECT efectivo FROM cajas WHERE id_caja = ?',
      [cajaId]
    );
    const [cargasAntes] = await query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM clientes_prepago_movimientos
        WHERE cliente_id = ? AND UPPER(tipo) = 'CARGA' AND monto = 10000`,
      [clienteId]
    );
    const [prepAbiertasAntes] = await query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM cuentas WHERE cliente_id = ? AND codigo LIKE 'PREP-%' AND estado = 1`,
      [clienteId]
    );

    await ClientService.addPrepago({
      cliente_id: clienteId,
      monto: 10000,
      tipo: 'CARGA',
      metodo_pago: 'efectivo',
      usuario_id: usuarioId
    });

    expect(await saldoDe(clienteId)).toBe(10000);
    const [caja] = await query<Record<string, number>[]>(
      'SELECT efectivo FROM cajas WHERE id_caja = ?',
      [cajaId]
    );
    expect(Number(caja.efectivo) - Number(cajaAntes.efectivo)).toBe(10000);
    const movimientos = await query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM clientes_prepago_movimientos
        WHERE cliente_id = ? AND UPPER(tipo) = 'CARGA' AND monto = 10000`,
      [clienteId]
    );
    expect(Number(movimientos[0].total) - Number(cargasAntes.total)).toBe(1);
    const prep = await query<{ estado: number }[]>(
      `SELECT estado FROM cuentas WHERE cliente_id = ? AND codigo LIKE 'PREP-%' AND estado = 1`,
      [clienteId]
    );
    expect(prep.length - Number(prepAbiertasAntes.total)).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('la devolución descuenta sin tocar caja y cierra la PREP al saldar', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await abrirCajaConEfectivo(50000);
    const { clienteId, usuarioId } = await clienteEnCero();
    const [cajaAntes] = await query<Record<string, number>[]>(
      'SELECT efectivo, devolucion FROM cajas WHERE id_caja = ?',
      [cajaId]
    );

    await ClientService.addPrepago({
      cliente_id: clienteId,
      monto: 10000,
      tipo: 'CARGA',
      metodo_pago: 'efectivo',
      usuario_id: usuarioId
    });
    const [cuentaNueva] = await query<{ id_cuenta: string }[]>(
      `SELECT id_cuenta FROM cuentas WHERE cliente_id = ? AND codigo LIKE 'PREP-%' AND estado = 1 ORDER BY fecha_crea DESC LIMIT 1`,
      [clienteId]
    );
    const estadoCuenta = async () =>
      Number(
        (
          await query<{ estado: number }[]>('SELECT estado FROM cuentas WHERE id_cuenta = ?', [
            cuentaNueva.id_cuenta
          ])
        )[0].estado
      );
    await ClientService.devolverSaldo({
      cliente_id: clienteId,
      monto: 4000,
      metodo_pago: 'transferencia',
      motivo: 'retiro parcial',
      usuario_id: usuarioId
    });
    expect(await saldoDe(clienteId)).toBe(6000);
    expect(await estadoCuenta()).toBe(1);

    await ClientService.devolverSaldo({
      cliente_id: clienteId,
      monto: 6000,
      metodo_pago: 'transferencia',
      usuario_id: usuarioId
    });
    expect(await saldoDe(clienteId)).toBe(0);
    expect(await estadoCuenta()).toBe(0);

    const [caja] = await query<Record<string, number>[]>(
      'SELECT efectivo, devolucion FROM cajas WHERE id_caja = ?',
      [cajaId]
    );
    expect(Number(caja.efectivo) - Number(cajaAntes.efectivo)).toBe(10000);
    expect(Number(caja.devolucion) - Number(cajaAntes.devolucion)).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('sin caja abierta la recarga falla sin escribir nada', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await query('UPDATE cajas SET estado = 0 WHERE estado = 1');
    const { clienteId, usuarioId } = await clienteEnCero();

    await expect(
      ClientService.addPrepago({
        cliente_id: clienteId,
        monto: 5000,
        tipo: 'CARGA',
        metodo_pago: 'efectivo',
        usuario_id: usuarioId
      })
    ).rejects.toThrow('No hay una caja abierta');

    expect(await saldoDe(clienteId)).toBe(0);
    const movimientos = await query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM clientes_prepago_movimientos
        WHERE cliente_id = ? AND UPPER(tipo) = 'CARGA' AND monto = 5000`,
      [clienteId]
    );
    expect(Number(movimientos[0].total)).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
