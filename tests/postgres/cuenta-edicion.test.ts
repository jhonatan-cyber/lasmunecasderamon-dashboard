/**
 * Edición de cuentas sobre APIs públicas, contra la base real.
 *
 * Cubre el camino migrado en el corte 20: agregar detalles y usuarios
 * acumula totales, extender tiempo actualiza el temporizador y cambiar de
 * habitación mueve la cuenta liberando la anterior, todo en una sola unidad.
 */
import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(async () => undefined),
  sendPushNotification: vi.fn(async () => undefined)
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { AccountService } from '@/lib/services/AccountService';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function crearHabitacion(sufijo: string): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
     VALUES (?, ?, 50000, 60, 5000, 1, now())`,
    [id, `PGE${sufijo}${id.slice(0, 4)}`]
  );
  return id;
}

async function crearCuentaBase(habitacionId: string | null = null): Promise<string> {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios LIMIT 1'
  );
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO cuentas (id_cuenta, codigo, total, sub_total, total_comision, propina,
         habitacion_id, tiempo, tiempo_actual, estado, fecha_crea, created_by)
     VALUES (?, ?, 0, 0, 0, 0, ?, 0, 0, 1, now(), ?)`,
    [id, `PGCE${id.slice(0, 6)}`, habitacionId, usuario.id_usuario]
  );
  return id;
}

it('agregar detalles acumula totales y vincula usuarios', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cuentaId = await crearCuentaBase();
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );

    await AccountService.updateCuenta(
      cuentaId,
      {
        detalles: [
          { producto_id: 'prod-1', precio: 10000, cantidad: 2, sub_total: 20000, comision: 1000 }
        ],
        usuarios: [usuario.id_usuario]
      } as any,
      usuario.id_usuario
    );

    const [cuenta] = await query<{ sub_total: number; total: number; total_comision: number }[]>(
      'SELECT sub_total, total, total_comision FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(Number(cuenta.sub_total)).toBe(20000);
    expect(Number(cuenta.total)).toBe(20000);
    expect(Number(cuenta.total_comision)).toBe(1000);
    const detalles = await query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM detalle_cuentas WHERE cuenta_id = ?',
      [cuentaId]
    );
    expect(Number(detalles[0].total)).toBe(1);
    const vinculos = await query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM cuentas_usuarios WHERE cuenta_id = ?',
      [cuentaId]
    );
    expect(Number(vinculos[0].total)).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('extender tiempo actualiza el temporizador sin cambiar la habitación', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const habitacionId = await crearHabitacion('T');
    const cuentaId = await crearCuentaBase(habitacionId);
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );

    await AccountService.updateCuenta(cuentaId, { extraTiempo: 30 } as any, usuario.id_usuario);

    const [cuenta] = await query<{ tiempo: number; tiempo_actual: number }[]>(
      'SELECT tiempo, tiempo_actual FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(Number(cuenta.tiempo)).toBe(30);
    expect(Number(cuenta.tiempo_actual)).toBe(30);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('cambiar de habitación mueve la cuenta y libera la anterior', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const habitacionA = await crearHabitacion('A');
    const habitacionB = await crearHabitacion('B');
    await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [habitacionA]);
    const cuentaId = await crearCuentaBase(habitacionA);
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );

    await AccountService.updateCuenta(
      cuentaId,
      { habitacion_id: habitacionB, tiempo: 45 } as any,
      usuario.id_usuario
    );

    const [cuenta] = await query<{ habitacion_id: string }[]>(
      'SELECT habitacion_id FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(cuenta.habitacion_id).toBe(habitacionB);
    const [anterior] = await query<{ estado: number }[]>(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [habitacionA]
    );
    expect(anterior.estado).toBe(1);
    const [nueva] = await query<{ estado: number }[]>(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [habitacionB]
    );
    expect(nueva.estado).toBe(2);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('crear una cuenta registra detalles, usuarios y ocupa la habitación', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const habitacionId = await crearHabitacion('C');
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );

    const creada = await AccountService.create(
      {
        codigo: `PGCC${Date.now().toString().slice(-6)}`,
        total_comision: 0,
        habitacion_id: habitacionId,
        sub_total: 30000,
        total: 30000,
        tiempo: 60,
        detalles: [
          { producto_id: 'prod-1', precio: 15000, cantidad: 2, sub_total: 30000, comision: 0 }
        ],
        usuarios: [usuario.id_usuario]
      } as any,
      usuario.id_usuario
    );
    const cuentaId = String((creada as { id_cuenta: string }).id_cuenta);

    const [cuenta] = await query<{ estado: number; tiempo_actual: number }[]>(
      'SELECT estado, tiempo_actual FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(cuenta.estado).toBe(1);
    expect(Number(cuenta.tiempo_actual)).toBe(60);
    const detalles = await query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM detalle_cuentas WHERE cuenta_id = ?',
      [cuentaId]
    );
    expect(Number(detalles[0].total)).toBe(1);
    const [habitacion] = await query<{ estado: number }[]>(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [habitacionId]
    );
    expect(habitacion.estado).toBe(2);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
