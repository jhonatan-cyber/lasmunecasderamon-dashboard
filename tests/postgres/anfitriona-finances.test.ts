import { afterAll, expect, it } from 'vitest';
import db, { query } from '@/lib/database/db';
import { CommissionService } from '@/modules/personal';
import { EventService } from '@/modules/agenda';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('muestra el monto personal y el pago parcial sin confundirlo con una anulación', async () => {
  const users = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios ORDER BY id_usuario LIMIT 2'
  );
  expect(users).toHaveLength(2);
  const sale = crypto.randomUUID(),
    commission = crypto.randomUUID();
  const detail = crypto.randomUUID(),
    second = crypto.randomUUID();
  try {
    await query(
      `INSERT INTO ventas (id_venta, codigo, metodo_pago, propina, sub_total, total, fecha_crea)
      VALUES (?, ?, 'efectivo', 0, 100000, 100000, now())`,
      [sale, sale.slice(0, 16)]
    );
    await query(
      `INSERT INTO comisiones (id_comision, venta_id, monto, estado, fecha_crea)
      VALUES (?, ?, 10000, 1, now())`,
      [commission, sale]
    );
    for (const [id, user, amount, state] of [
      [detail, users[0].id_usuario, 4000, 0],
      [second, users[1].id_usuario, 6000, 1]
    ]) {
      await query(
        `INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado, fecha_crea, fecha_mod)
        VALUES (?, ?, ?, ?, ?, now(), now())`,
        [id, commission, user, amount, state]
      );
    }
    const paid = (await CommissionService.getDetails(users[0].id_usuario)).filter(
      (row: any) => row.id === commission
    );
    expect(paid).toHaveLength(1);
    expect(paid[0]).toMatchObject({ monto: 4000, estado: 'Pagado' });
    expect(paid[0].fecha_pago).toBeTruthy();
    const pending = (await CommissionService.getDetails(users[1].id_usuario)).find(
      (row: any) => row.id === commission
    );
    expect(pending).toMatchObject({ monto: 6000, estado: 'Por pagar' });
    const event = (await EventService.getUserEvents(users[0].id_usuario)).find(
      (row: any) => row.id === detail
    );
    expect(event).toMatchObject({ amount: 4000, estado: 2 });
    await query('UPDATE comisiones SET estado = 0 WHERE id_comision = ?', [commission]);
    expect(
      (await CommissionService.getDetails(users[0].id_usuario)).find(
        (row: any) => row.id === commission
      ).estado
    ).toBe('Anulado');
  } finally {
    await query('DELETE FROM detalle_comisiones WHERE comision_id = ?', [commission]);
    await query('DELETE FROM comisiones WHERE id_comision = ?', [commission]);
    await query('DELETE FROM ventas WHERE id_venta = ?', [sale]);
  }
});
