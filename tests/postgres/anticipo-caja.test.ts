/**
 * Anticipos contra caja sobre APIs públicas, contra la base real.
 *
 * Cubre el camino migrado en el corte 17: otorgar y entregar un anticipo
 * descuentan el efectivo y postulan el movimiento en la misma unidad que el
 * registro; sin caja o sin efectivo fallan sin escribir nada.
 */
import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(async () => undefined),
  sendPushNotification: vi.fn(async () => undefined)
}));
vi.mock('@/lib/integrations/whatsappService', () => ({ enviarWhatsApp: vi.fn() }));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { otorgarAnticipo, entregarAnticipo } from '@/modules/personal';

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

async function usuarioConSueldo(): Promise<string> {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios WHERE sueldo > 0 LIMIT 1'
  );
  await query(
    'INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, now(), ?, 1)',
    [crypto.randomUUID(), usuario.id_usuario, '12:00:00']
  );
  return usuario.id_usuario;
}

async function cajaNumeros(id: string) {
  const [row] = await query<Record<string, number>[]>(
    'SELECT efectivo, anticipo FROM cajas WHERE id_caja = ?',
    [id]
  );
  return { efectivo: Number(row.efectivo), anticipo: Number(row.anticipo) };
}

it('otorgar un anticipo descuenta efectivo y postula el movimiento', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await abrirCajaConEfectivo(50000);
    const usuarioId = await usuarioConSueldo();
    const antes = await cajaNumeros(cajaId);

    const otorgado = await otorgarAnticipo(usuarioId, 1000, 'Corte 17', undefined, usuarioId);
    expect(otorgado).toBeTruthy();

    const despues = await cajaNumeros(cajaId);
    expect(despues.efectivo - antes.efectivo).toBe(-1000);
    expect(despues.anticipo - antes.anticipo).toBe(1000);

    const historial = await query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM anticipo_historial WHERE anticipo_id = ?`,
      [(otorgado as { id_anticipo: string }).id_anticipo]
    );
    expect(Number(historial[0].total)).toBe(3);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('entregar un anticipo aprobado descuenta efectivo una sola vez', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await abrirCajaConEfectivo(50000);
    const usuarioId = await usuarioConSueldo();
    const antes = await cajaNumeros(cajaId);

    await query(
      `INSERT INTO anticipos (id_anticipo, usuario_id, monto, motivo, estado, fecha_crea)
       VALUES (?, ?, 2000, 'Entrega', 1, now())`,
      [crypto.randomUUID(), usuarioId]
    );

    const [pendiente] = await query<{ id_anticipo: string }[]>(
      'SELECT id_anticipo FROM anticipos WHERE usuario_id = ? AND estado = 1 AND monto = 2000 ORDER BY fecha_crea DESC LIMIT 1',
      [usuarioId]
    );
    const resultado = await entregarAnticipo(pendiente.id_anticipo, usuarioId);
    expect(resultado.ok).toBe(true);

    const despues = await cajaNumeros(cajaId);
    expect(despues.efectivo - antes.efectivo).toBe(-2000);
    expect(despues.anticipo - antes.anticipo).toBe(2000);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('sin efectivo suficiente falla sin registrar el anticipo', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await abrirCajaConEfectivo(100);
    const usuarioId = await usuarioConSueldo();

    await expect(otorgarAnticipo(usuarioId, 5000, 'Sin fondo')).rejects.toThrow(
      'No hay suficiente efectivo'
    );

    const filas = await query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM anticipos WHERE usuario_id = ? AND monto = 5000',
      [usuarioId]
    );
    expect(Number(filas[0].total)).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
