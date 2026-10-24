/**
 * Alta y edición de cuentas con champaña sin configurar, contra la base real.
 *
 * `POST /api/accounts` y `PUT /api/accounts/:id` son otro camino de venta: la
 * unidad de cuenta valida la tabla de precios por anfitrionas antes de escribir
 * la cabecera o de acumular consumos.
 */
import { afterAll, expect, it, vi } from 'vitest';

vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { AccountService } from '@/modules/operacion/cuentas/fachada';
import { MENSAJE_CHAMPAGNE_SIN_CONFIGURAR } from '@/lib/business/champagne';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function crearChampana(opciones: { maxAnfitrionas?: number } = {}) {
  const categoriaId = crypto.randomUUID();
  const productoId = crypto.randomUUID();
  await query(
    `INSERT INTO categorias (id_categoria, nombre, estado, fecha_crea)
     VALUES (?, 'Champaña', 1, now())`,
    [categoriaId]
  );
  await query(
    `INSERT INTO productos (id_producto, codigo, nombre, categoria_id, precio, comision, max_anfitrionas, fecha_crea)
     VALUES (?, ?, 'Champaña de cuenta', ?, 120000, 40000, ?, now())`,
    [productoId, `PGCC${Date.now().toString(36)}`, categoriaId, opciones.maxAnfitrionas ?? null]
  );
  return productoId;
}

async function crearCuentaBase(usuarioId: string): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO cuentas (id_cuenta, codigo, total, sub_total, total_comision, propina,
         habitacion_id, tiempo, tiempo_actual, estado, fecha_crea, created_by)
     VALUES (?, ?, 0, 0, 0, 0, NULL, 0, 0, 1, now(), ?)`,
    [id, `PGCH${id.slice(0, 6)}`, usuarioId]
  );
  return id;
}

const detalle = (productoId: string) => ({
  producto_id: productoId,
  precio: 120000,
  cantidad: 1,
  sub_total: 120000,
  comision: 40000
});

it('no crea la cuenta con una champaña sin tabla de precios ni máximo', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const productoId = await crearChampana();
    const cuentasAntes = Number(
      (await query<{ total: string }[]>('SELECT COUNT(*) AS total FROM cuentas'))[0].total
    );

    await expect(
      AccountService.create(
        {
          codigo: `PGCH${Date.now().toString(36)}`,
          total_comision: 40000,
          sub_total: 120000,
          total: 120000,
          detalles: [detalle(productoId)]
        } as any,
        user.id_usuario
      )
    ).rejects.toThrow(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);

    const cuentasDespues = Number(
      (await query<{ total: string }[]>('SELECT COUNT(*) AS total FROM cuentas'))[0].total
    );
    expect(cuentasDespues).toBe(cuentasAntes);
    expect(
      (await query('SELECT cuenta_id FROM detalle_cuentas WHERE producto_id = ?', [productoId]))
        .length
    ).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('no suma consumos de una champaña sin configurar a una cuenta abierta', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const productoId = await crearChampana();
    const cuentaId = await crearCuentaBase(user.id_usuario);

    await expect(
      AccountService.updateCuenta(
        cuentaId,
        {
          detalles: [detalle(productoId)],
          usuarios: [user.id_usuario]
        } as any,
        user.id_usuario
      )
    ).rejects.toThrow(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);

    const [cuenta] = await query<{ sub_total: number; total: number; total_comision: number }[]>(
      'SELECT sub_total, total, total_comision FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(Number(cuenta.sub_total)).toBe(0);
    expect(Number(cuenta.total)).toBe(0);
    expect(Number(cuenta.total_comision)).toBe(0);
    expect(
      (await query('SELECT cuenta_id FROM detalle_cuentas WHERE cuenta_id = ?', [cuentaId])).length
    ).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('suma los consumos cuando la champaña tiene máximo configurado', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const [user] = await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios LIMIT 1');
    const productoId = await crearChampana({ maxAnfitrionas: 2 });
    const cuentaId = await crearCuentaBase(user.id_usuario);

    await AccountService.updateCuenta(
      cuentaId,
      { detalles: [detalle(productoId)], usuarios: [user.id_usuario] } as any,
      user.id_usuario
    );

    const [cuenta] = await query<{ sub_total: number; total: number }[]>(
      'SELECT sub_total, total FROM cuentas WHERE id_cuenta = ?',
      [cuentaId]
    );
    expect(Number(cuenta.sub_total)).toBe(120000);
    expect(Number(cuenta.total)).toBe(120000);
    expect(
      (await query('SELECT cuenta_id FROM detalle_cuentas WHERE cuenta_id = ?', [cuentaId])).length
    ).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
