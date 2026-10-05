/**
 * Anulación de servicios sobre APIs públicas, contra la base real.
 *
 * Cubre el camino migrado en el corte 15: solicitar → procesar (aprobar) una
 * anulación revierte prepago, caja, comisiones, habitación y disponibilidad en
 * una sola unidad; rechazarla devuelve el servicio a su estado.
 */
import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(),
  sendPushByUser: vi.fn(),
  sendPushToUser: vi.fn()
}));
vi.mock('@/lib/services/SecurityAlertService', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { ServiceService } from '@/lib/services/ServiceService';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function abrirCajaSiHaceFalta(): Promise<string> {
  const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
  const [caja] = await query<{ id_caja: string }[]>(
    'SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1'
  );
  if (caja) return caja.id_caja;
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
         monto_cierre, efectivo, tarjeta, transferencia, venta, servicio, cargo_tarjeta, iva, comision,
         propina, anticipo, estado)
       VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
    [id, user.id_usuario]
  );
  return id;
}

async function crearServicioFixture() {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios LIMIT 1'
  );
  const [cliente] = await query<{ id_cliente: string; saldo: number }[]>(
    'SELECT id_cliente, saldo FROM clientes LIMIT 1'
  );
  const cajaId = await abrirCajaSiHaceFalta();
  const servicioId = crypto.randomUUID();
  const comisionId = crypto.randomUUID();

  await query(
    `INSERT INTO servicios (id_servicio, codigo, cliente_id, metodo_pago, precio_habitacion,
         precio_servicio, total, iva, sub_total, tiempo, caja_id, created_by, estado, fecha_crea)
     VALUES (?, ?, ?, 'efectivo', 0, 20000, 20000, 2000, 18000, 0, ?, ?, 1, now())`,
    [servicioId, `PGSAN${servicioId.slice(0, 6)}`, cliente.id_cliente, cajaId, usuario.id_usuario]
  );
  await query(
    `INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision, fecha_crea)
     VALUES (?, ?, ?, 3000, now())`,
    [crypto.randomUUID(), usuario.id_usuario, servicioId]
  );
  await query(
    `INSERT INTO comisiones (id_comision, servicio_id, monto, estado, fecha_crea)
     VALUES (?, ?, 3000, 1, now())`,
    [comisionId, servicioId]
  );
  await query(
    `INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado, fecha_crea)
     VALUES (?, ?, ?, 3000, 1, now())`,
    [crypto.randomUUID(), comisionId, usuario.id_usuario]
  );
  // Consumo de prepago previo: la anulación debe restituirlo.
  await query('UPDATE clientes SET saldo = 0 WHERE id_cliente = ?', [cliente.id_cliente]);
  await query(
    `INSERT INTO clientes_prepago_movimientos
       (id_movimiento, cliente_id, tipo, monto, metodo_pago, venta_id, usuario_id, fecha_crea, metadatos)
     VALUES (?, ?, 'CONSUMO', 5000, 'prepago', ?, ?, now(), ?)`,
    [crypto.randomUUID(), cliente.id_cliente, servicioId, usuario.id_usuario, JSON.stringify({})]
  );
  const [cajaAntes] = await query<Record<string, number>[]>(
    'SELECT servicio, efectivo, iva, prepago, comision, devolucion FROM cajas WHERE id_caja = ?',
    [cajaId]
  );

  return {
    usuarioId: usuario.id_usuario,
    clienteId: cliente.id_cliente,
    cajaId,
    servicioId,
    cajaAntes
  };
}

it('aprobar la anulación revierte prepago, caja, comisiones y pedido en una unidad', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const fixture = await crearServicioFixture();

    const token = await ServiceService.requestAnulacion(
      fixture.servicioId,
      'Cliente insatisfecho',
      fixture.usuarioId
    );
    expect(token).toBeTruthy();
    const [solicitud] = await query<{ id: string }[]>(
      'SELECT id FROM solicitudes_anulacion_servicios WHERE token = ?',
      [token]
    );

    const [pendiente] = await query<{ estado: number }[]>(
      'SELECT estado FROM servicios WHERE id_servicio = ?',
      [fixture.servicioId]
    );
    expect(pendiente.estado).toBe(1);

    await ServiceService.processAnulacion(solicitud.id, fixture.usuarioId, 'confirmada');

    const [servicio] = await query<{ estado: number }[]>(
      'SELECT estado FROM servicios WHERE id_servicio = ?',
      [fixture.servicioId]
    );
    expect(servicio.estado).toBe(0);

    const [saldo] = await query<{ saldo: number }[]>(
      'SELECT saldo FROM clientes WHERE id_cliente = ?',
      [fixture.clienteId]
    );
    expect(Number(saldo.saldo)).toBe(5000);
    const devoluciones = await query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM clientes_prepago_movimientos
        WHERE cliente_id = ? AND UPPER(tipo) = 'DEVOLUCION'`,
      [fixture.clienteId]
    );
    expect(Number(devoluciones[0].total)).toBe(1);

    const [caja] = await query<Record<string, number>[]>(
      'SELECT servicio, efectivo, iva, prepago, comision, devolucion FROM cajas WHERE id_caja = ?',
      [fixture.cajaId]
    );
    expect(Number(caja.servicio) - Number(fixture.cajaAntes.servicio)).toBe(-18000);
    expect(Number(caja.efectivo) - Number(fixture.cajaAntes.efectivo)).toBe(-15000);
    expect(Number(caja.iva) - Number(fixture.cajaAntes.iva)).toBe(-2000);
    expect(Number(caja.prepago) - Number(fixture.cajaAntes.prepago)).toBe(-5000);
    expect(Number(caja.comision) - Number(fixture.cajaAntes.comision)).toBe(-3000);
    expect(Number(caja.devolucion) - Number(fixture.cajaAntes.devolucion)).toBe(20000);

    const [comision] = await query<{ estado: number }[]>(
      'SELECT estado FROM comisiones WHERE servicio_id = ?',
      [fixture.servicioId]
    );
    expect(comision.estado).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('rechazar la anulación devuelve el servicio a su estado sin mover plata', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const fixture = await crearServicioFixture();

    const token = await ServiceService.requestAnulacion(
      fixture.servicioId,
      'Reclamo retirado',
      fixture.usuarioId
    );
    const [solicitud] = await query<{ id: string }[]>(
      'SELECT id FROM solicitudes_anulacion_servicios WHERE token = ?',
      [token]
    );
    await ServiceService.processAnulacion(solicitud.id, fixture.usuarioId, 'rechazada');

    const [servicio] = await query<{ estado: number }[]>(
      'SELECT estado FROM servicios WHERE id_servicio = ?',
      [fixture.servicioId]
    );
    expect(servicio.estado).toBe(1);

    const [saldo] = await query<{ saldo: number }[]>(
      'SELECT saldo FROM clientes WHERE id_cliente = ?',
      [fixture.clienteId]
    );
    expect(Number(saldo.saldo)).toBe(0);
    const [caja] = await query<Record<string, number>[]>(
      'SELECT servicio, devolucion FROM cajas WHERE id_caja = ?',
      [fixture.cajaId]
    );
    expect(Number(caja.servicio)).toBe(Number(fixture.cajaAntes.servicio));
    expect(Number(caja.devolucion)).toBe(Number(fixture.cajaAntes.devolucion));
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
