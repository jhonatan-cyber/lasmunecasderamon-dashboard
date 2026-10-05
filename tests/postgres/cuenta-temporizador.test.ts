/**
 * Temporizador y solicitud de anulación de cuentas sobre APIs públicas,
 * contra la base real.
 *
 * Cubre el camino migrado en el corte 19: detener el temporizador cierra la
 * sesión de habitación y libera la habitación en una sola unidad; solicitar
 * la anulación congela el temporizador, libera la habitación y deja la
 * cuenta en estado 2 con su solicitud pendiente.
 */
import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(async () => undefined),
  sendPushNotification: vi.fn(async () => undefined)
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { AccountService } from '@/modules/operacion/cuentas/fachada';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function crearHabitacionOcupada(): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
     VALUES (?, ?, 50000, 60, 5000, 2, now())`,
    [id, `PGH${id.slice(0, 6)}`]
  );
  return id;
}

async function crearCuentaConTemporizador(): Promise<{ cuentaId: string; habitacionId: string }> {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios LIMIT 1'
  );
  const habitacionId = await crearHabitacionOcupada();
  const cuentaId = crypto.randomUUID();
  await query(
    `INSERT INTO cuentas (id_cuenta, codigo, total, sub_total, total_comision, propina,
         habitacion_id, tiempo, tiempo_actual, tiempo_inicio_actual, estado, fecha_crea, created_by)
     VALUES (?, ?, 50000, 50000, 0, 0, ?, 60, 30, now(), 1, now(), ?)`,
    [cuentaId, `PGCT${cuentaId.slice(0, 6)}`, habitacionId, usuario.id_usuario]
  );
  return { cuentaId, habitacionId };
}

it('detener el temporizador cierra la sesión y libera la habitación', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const { cuentaId, habitacionId } = await crearCuentaConTemporizador();
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );

    await AccountService.stopTimer(cuentaId, usuario.id_usuario);

    const [cuenta] = await query<{ tiempo_actual: number }[]>(
      'SELECT tiempo_actual FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(Number(cuenta.tiempo_actual)).toBe(0);
    const [habitacion] = await query<{ estado: number }[]>(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [habitacionId]
    );
    expect(habitacion.estado).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('solicitar la anulación congela el temporizador y deja la cuenta en 2', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const { cuentaId, habitacionId } = await crearCuentaConTemporizador();
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );

    const idAnul = await AccountService.requestAnulacion(
      cuentaId,
      'Cliente se retira',
      usuario.id_usuario,
      10000
    );
    expect(idAnul).toBeTruthy();

    const [cuenta] = await query<{ estado: number; tiempo_actual: number }[]>(
      'SELECT estado, tiempo_actual FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(cuenta.estado).toBe(2);
    expect(Number(cuenta.tiempo_actual)).toBe(0);
    const [solicitud] = await query<{ estado: string; monto: number }[]>(
      'SELECT estado, monto FROM solicitudes_anulacion_cuentas WHERE id = ?',
      [idAnul]
    );
    expect(solicitud.estado).toBe('pendiente');
    expect(Number(solicitud.monto)).toBe(10000);
    const [habitacion] = await query<{ estado: number }[]>(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [habitacionId]
    );
    expect(habitacion.estado).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('solicitar con monto mayor al total falla sin cambiar nada', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const { cuentaId } = await crearCuentaConTemporizador();
    const [usuario] = await query<{ id_usuario: string }[]>(
      'SELECT id_usuario FROM usuarios LIMIT 1'
    );

    await expect(
      AccountService.requestAnulacion(cuentaId, 'Monto abusivo', usuario.id_usuario, 999999)
    ).rejects.toThrow('no puede ser mayor al total');

    const [cuenta] = await query<{ estado: number }[]>(
      'SELECT estado FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(cuenta.estado).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
