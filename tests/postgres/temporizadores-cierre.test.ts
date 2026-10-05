/**
 * Cierre de temporizadores vencidos sobre APIs públicas, contra la base real.
 *
 * Cubre el camino migrado en el corte 22: un servicio con el tiempo agotado
 * se cierra en una sola unidad con disponibilidad y habitación liberada; uno
 * vigente no se toca.
 */
import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(async () => undefined),
  sendPushNotification: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => undefined),
  sendPushByUser: vi.fn(async () => undefined)
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { ServiceService } from '@/lib/services/ServiceService';
import { revisarTemporizadores } from '@/modules/operacion';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function abrirCajaSiHaceFalta(): Promise<void> {
  const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
  const [caja] = await query<{ id_caja: string }[]>(
    'SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1'
  );
  if (!caja) {
    await query(
      `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
           monto_cierre, efectivo, tarjeta, transferencia, venta, servicio, cargo_tarjeta, iva, comision,
           propina, anticipo, estado)
        VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
      [crypto.randomUUID(), user.id_usuario]
    );
  }
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

async function crearServicioConTiempo(
  minutosVencidos: boolean
): Promise<{ id: string; habitacionId: string }> {
  const anfitriona = await fixtureAnfitriona();
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios LIMIT 1'
  );
  const habitacionId = crypto.randomUUID();
  await query(
    `INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
     VALUES (?, ?, 50000, 60, 5000, 1, now())`,
    [habitacionId, `PGT${habitacionId.slice(0, 6)}`]
  );
  const venta = await ServiceService.createService(
    {
      habitacion_id: habitacionId,
      precio_habitacion: 50000,
      precio_servicio: 20000,
      iva: 0,
      sub_total: 70000,
      total: 70000,
      tiempo: 60,
      metodo_pago: 'efectivo',
      usuarios: [anfitriona],
      clientes: []
    },
    usuario.id_usuario
  );
  const id = String((venta as { id: string }).id);
  if (minutosVencidos) {
    await query(
      `UPDATE servicios SET fecha_crea = now() - interval '2 hours' WHERE id_servicio = ?`,
      [id]
    );
  }
  return { id, habitacionId };
}

it('cierra el servicio vencido y libera la habitación en una unidad', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaSiHaceFalta();
    const { id, habitacionId } = await crearServicioConTiempo(true);

    const resultado = await revisarTemporizadores(new Date());
    expect(resultado.cierres).toBeGreaterThanOrEqual(1);

    const [servicio] = await query<{ estado: number }[]>(
      'SELECT estado FROM servicios WHERE id_servicio = ?',
      [id]
    );
    expect(servicio.estado).toBe(1);
    const [habitacion] = await query<{ estado: number }[]>(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [habitacionId]
    );
    expect(habitacion.estado).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('no toca el servicio con tiempo vigente', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaSiHaceFalta();
    const { id } = await crearServicioConTiempo(false);

    await revisarTemporizadores(new Date());

    const [servicio] = await query<{ estado: number }[]>(
      'SELECT estado FROM servicios WHERE id_servicio = ?',
      [id]
    );
    expect(servicio.estado).toBe(2);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
