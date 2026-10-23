/**
 * Reservas de quincho: el total se acredita al prepago del cliente y entra a
 * caja como una recarga; anular devuelve ese saldo y deja la reserva anulada.
 * Todo sobre la base real, con la misma unidad de trabajo que usa el API.
 */
import { afterAll, expect, it } from 'vitest';
import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { reservarQuincho, anularReservaQuincho } from '@/workflows/reservas-quincho';
import { ConflictError } from '@/lib/errors/errors';

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

const reservaBase = (clienteId: string) => ({
  cliente_id: clienteId,
  fecha_reserva: '2026-11-20',
  cantidad_personas: 10,
  monto_por_persona: 5000,
  metodo_pago: 'efectivo' as const
});

it('la reserva acredita el total al prepago, mueve caja y abre la cuenta PREP', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await abrirCajaConEfectivo(50000);
    const { clienteId, usuarioId } = await clienteEnCero();
    const [cajaAntes] = await query<Record<string, number>[]>(
      'SELECT efectivo FROM cajas WHERE id_caja = ?',
      [cajaId]
    );

    const reserva = await reservarQuincho(reservaBase(clienteId), usuarioId);

    // Total recalculado por el servidor: personas × monto por persona.
    expect(reserva.total).toBe(50000);
    expect(reserva.estado).toBe('activa');
    expect(reserva.fecha_reserva).toBe('2026-11-20');

    const [fila] = await query<Record<string, unknown>[]>(
      `SELECT cantidad_personas, monto_por_persona, total, estado, metodo_pago
         FROM reservas_quincho WHERE id = ?`,
      [reserva.id]
    );
    expect(Number(fila.cantidad_personas)).toBe(10);
    expect(Number(fila.monto_por_persona)).toBe(5000);
    expect(Number(fila.total)).toBe(50000);
    expect(fila.estado).toBe('activa');
    expect(fila.metodo_pago).toBe('efectivo');

    // El saldo prepago del cliente sube por el total.
    expect(await saldoDe(clienteId)).toBe(50000);
    const [caja] = await query<Record<string, number>[]>(
      'SELECT efectivo FROM cajas WHERE id_caja = ?',
      [cajaId]
    );
    expect(Number(caja.efectivo) - Number(cajaAntes.efectivo)).toBe(50000);

    const cargas = await query<{ monto: number }[]>(
      `SELECT monto FROM clientes_prepago_movimientos
        WHERE cliente_id = ? AND UPPER(tipo) = 'CARGA' AND monto = 50000`,
      [clienteId]
    );
    expect(cargas).toHaveLength(1);

    const prep = await query<{ estado: number }[]>(
      `SELECT estado FROM cuentas WHERE cliente_id = ? AND codigo LIKE 'PREP-%' AND estado = 1`,
      [clienteId]
    );
    expect(prep.length).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('anular devuelve el saldo, cierra la PREP y no permite anular dos veces', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaConEfectivo(50000);
    const { clienteId, usuarioId } = await clienteEnCero();
    const reserva = await reservarQuincho(reservaBase(clienteId), usuarioId);
    expect(await saldoDe(clienteId)).toBe(50000);

    const anulada = await anularReservaQuincho(reserva.id, usuarioId);

    expect(anulada.estado).toBe('anulada');
    expect(anulada.fecha_anulacion).toBeTruthy();
    expect(await saldoDe(clienteId)).toBe(0);
    const devoluciones = await query<{ monto: number }[]>(
      `SELECT monto FROM clientes_prepago_movimientos
        WHERE cliente_id = ? AND UPPER(tipo) = 'DEVOLUCION' AND monto = 50000`,
      [clienteId]
    );
    expect(devoluciones).toHaveLength(1);
    const prep = await query<{ estado: number }[]>(
      `SELECT estado FROM cuentas WHERE cliente_id = ? AND codigo LIKE 'PREP-%'`,
      [clienteId]
    );
    expect(prep.every(cuenta => Number(cuenta.estado) === 0)).toBe(true);

    await expect(anularReservaQuincho(reserva.id, usuarioId)).rejects.toThrow(ConflictError);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('no anula si el cliente ya consumió el saldo de la reserva', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaConEfectivo(50000);
    const { clienteId, usuarioId } = await clienteEnCero();
    const reserva = await reservarQuincho(reservaBase(clienteId), usuarioId);
    await query('UPDATE clientes SET saldo = 1000 WHERE id_cliente = ?', [clienteId]);

    await expect(anularReservaQuincho(reserva.id, usuarioId)).rejects.toThrow('Saldo insuficiente');

    const [fila] = await query<{ estado: string }[]>(
      'SELECT estado FROM reservas_quincho WHERE id = ?',
      [reserva.id]
    );
    expect(fila.estado).toBe('activa');
    expect(await saldoDe(clienteId)).toBe(1000);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('sin caja abierta la reserva se rechaza y no escribe nada', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await query('UPDATE cajas SET estado = 0 WHERE estado = 1');
    const { clienteId, usuarioId } = await clienteEnCero();

    await expect(reservarQuincho(reservaBase(clienteId), usuarioId)).rejects.toThrow(
      'No hay una caja abierta'
    );

    const filas = await query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM reservas_quincho WHERE cliente_id = ? AND total = 50000`,
      [clienteId]
    );
    expect(Number(filas[0].total)).toBe(0);
    expect(await saldoDe(clienteId)).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
