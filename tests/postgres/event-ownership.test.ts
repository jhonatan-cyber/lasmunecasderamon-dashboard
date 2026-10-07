import { afterAll, expect, it } from 'vitest';
import db, { query } from '@/lib/database/db';
import { EventService } from '@/modules/agenda';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('el filtro de fechas incluye todo el último día y excluye el siguiente', async () => {
  const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
  const lastDay = crypto.randomUUID();
  const nextDay = crypto.randomUUID();
  try {
    for (const [id, date] of [
      [lastDay, '2026-01-12 23:59:59'],
      [nextDay, '2026-01-13 00:00:00']
    ]) {
      await query(
        'INSERT INTO gratificaciones (id, usuario_id, monto, descripcion, fecha_crea, estado) VALUES (?, ?, 1000, ?, ?, 1)',
        [id, user.id_usuario, 'Review dates', date]
      );
    }
    const events = await EventService.getUserEvents(user.id_usuario, '2026-01-12', '2026-01-12');
    expect(events.some((event: any) => event.id === lastDay)).toBe(true);
    expect(events.some((event: any) => event.id === nextDay)).toBe(false);
    const untilDate = await EventService.getUserEvents(user.id_usuario, undefined, '2026-01-12');
    expect(untilDate.some((event: any) => event.id === lastDay)).toBe(true);
    expect(untilDate.some((event: any) => event.id === nextDay)).toBe(false);
  } finally {
    await query('DELETE FROM gratificaciones WHERE id IN (?, ?)', [lastDay, nextDay]);
  }
});

it('verifica la pertenencia de todos los tipos sin permitir IDs ajenos', async () => {
  const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
  for (const type of [
    'propina',
    'comision',
    'asistencia',
    'anticipo',
    'gratificacion',
    'hora_extra',
    'servicio',
    'venta',
    '__proto__'
  ]) {
    expect(await EventService.canReadEvent('review-missing', type, user.id_usuario)).toBe(false);
  }
  const id = crypto.randomUUID();
  try {
    await query(
      'INSERT INTO gratificaciones (id, usuario_id, monto, descripcion, fecha_crea, estado) VALUES (?, ?, 1000, ?, now(), 1)',
      [id, user.id_usuario, 'Review ownership']
    );
    expect(await EventService.canReadEvent(id, 'gratificacion', user.id_usuario)).toBe(true);
    expect(await EventService.canReadEvent(id, 'gratificacion', 'review-other-user')).toBe(false);
  } finally {
    await query('DELETE FROM gratificaciones WHERE id = ?', [id]);
  }
});
