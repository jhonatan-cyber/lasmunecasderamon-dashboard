/**
 * Alta y edición de servicios sobre APIs públicas, contra la base real.
 *
 * Cubre el camino migrado en el corte 16: crear un servicio postula caja,
 * comisiones, habitación y disponibilidad en una sola unidad; editarlo
 * ajusta el IVA de la caja sin duplicar movimientos.
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

async function fixtureAnfitriona(): Promise<string> {
  const [usuario] = await query<{ id_usuario: string }[]>(
    `SELECT u.id_usuario FROM usuarios u
      INNER JOIN roles r ON r.id_rol = u.rol_id
     WHERE LOWER(r.nombre) = 'anfitriona' AND u.estado = 1 LIMIT 1`
  );
  await query('DELETE FROM logins WHERE usuario_id = ?', [usuario.id_usuario]);
  await query(
    'INSERT INTO logins (id_login, usuario_id, last_login, estado, en_local) VALUES (?, ?, now(), 1, 1)',
    [crypto.randomUUID(), usuario.id_usuario]
  );
  return usuario.id_usuario;
}

async function crearHabitacion(): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
     VALUES (?, ?, 50000, 60, 5000, 1, now())`,
    [id, `PGH${id.slice(0, 6)}`]
  );
  return id;
}

it('crear un servicio postula caja, comisiones y habitación en una unidad', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await abrirCajaSiHaceFalta();
    const anfitriona = await fixtureAnfitriona();
    const habitacionId = await crearHabitacion();
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );
    const [cajaAntes] = await query<Record<string, number>[]>(
      'SELECT servicio, efectivo, iva, comision FROM cajas WHERE id_caja = ?',
      [cajaId]
    );

    const resultado = await ServiceService.createService(
      {
        habitacion_id: habitacionId,
        precio_habitacion: 50000,
        precio_servicio: 20000,
        iva: 2000,
        sub_total: 68000,
        total: 70000,
        tiempo: 60,
        metodo_pago: 'efectivo',
        usuarios: [anfitriona],
        clientes: []
      },
      usuario.id_usuario
    );

    expect(resultado.id).toBeTruthy();
    const [servicio] = await query<{ estado: number; caja_id: string }[]>(
      'SELECT estado, caja_id FROM servicios WHERE id_servicio = ?',
      [resultado.id]
    );
    expect(servicio.estado).toBe(2);
    expect(servicio.caja_id).toBe(cajaId);

    const [habitacion] = await query<{ estado: number }[]>(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [habitacionId]
    );
    expect(habitacion.estado).toBe(2);

    const comisiones = await query<{ total: string }[]>(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM comisiones WHERE servicio_id = ? AND estado = 1`,
      [resultado.id]
    );
    expect(Number(comisiones[0].total)).toBe(5000);

    const [caja] = await query<Record<string, number>[]>(
      'SELECT servicio, efectivo, iva, comision FROM cajas WHERE id_caja = ?',
      [cajaId]
    );
    expect(Number(caja.servicio) - Number(cajaAntes.servicio)).toBe(68000);
    expect(Number(caja.efectivo) - Number(cajaAntes.efectivo)).toBe(70000);
    expect(Number(caja.iva) - Number(cajaAntes.iva)).toBe(2000);
    expect(Number(caja.comision) - Number(cajaAntes.comision)).toBe(5000);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('editar el iva ajusta la caja sin duplicar el servicio', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaSiHaceFalta();
    const anfitriona = await fixtureAnfitriona();
    const habitacionId = await crearHabitacion();
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );

    const resultado = await ServiceService.createService(
      {
        habitacion_id: habitacionId,
        precio_habitacion: 50000,
        precio_servicio: 20000,
        iva: 2000,
        sub_total: 68000,
        total: 70000,
        tiempo: 60,
        metodo_pago: 'efectivo',
        usuarios: [anfitriona],
        clientes: []
      },
      usuario.id_usuario
    );
    const [caja] = await query<{ id_caja: string; iva: number }[]>(
      'SELECT id_caja, iva FROM cajas WHERE estado = 1 LIMIT 1'
    );

    await ServiceService.updateService(resultado.id, { iva: 3500 });

    const [despues] = await query<{ iva: number }[]>('SELECT iva FROM cajas WHERE id_caja = ?', [
      caja.id_caja
    ]);
    expect(Number(despues.iva) - Number(caja.iva)).toBe(1500);
    const conteo = await query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM servicios WHERE id_servicio = ?',
      [resultado.id]
    );
    expect(Number(conteo[0].total)).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
