import { afterAll, expect, it } from 'vitest';

import db, { query } from '@/lib/database/db';
import { restoreDatabase, snapshotDatabase } from '@/lib/database/maintenance';
import { obtenerResumenShots } from '@/modules/inventario';

/**
 * El resumen del bar cuenta lo que **salió** del bar. Una venta anulada
 * devolvió la bebida, así que sus ml ya no están servidos: el resumen tiene que
 * descontarlos.
 *
 * La anulación de una venta de ayer no toca el resumen de hoy: esa venta no
 * contaba para hoy y su devolución tampoco tiene que restar.
 */

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

interface Movimiento {
  id: string;
  tipo: 'venta' | 'devolucion';
  ml: number;
  fecha_crea: string;
}

/** Inserta un movimiento de inventario con la fecha que le pida el caso. */
async function insertarMovimiento(
  tipo: Movimiento['tipo'],
  ml: number,
  fecha_crea: string,
  movimiento_origen?: string
): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO inventario_movimientos
       (id, tipo, estado, producto_id, presentacion_id, cantidad, precio_venta, comision,
        usuario_id, ml, fecha_crea${movimiento_origen ? ', movimiento_origen' : ''})
     VALUES (?, ?, 'completada', NULL, NULL, 0, 0, 0, NULL, ?, ?${movimiento_origen ? ', ?' : ''})`,
    movimiento_origen ? [id, tipo, ml, fecha_crea, movimiento_origen] : [id, tipo, ml, fecha_crea]
  );
  return id;
}

const inicioDelDia = async () => {
  const [dia] = await query<{ dia: string }[]>(`SELECT to_char(now(), 'YYYY-MM-DD') AS dia`);
  return dia.dia;
};

/** Marca de tiempo de ayer, en la misma hora del día que el resto del caso. */
const ayerA = (hora: string) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 1);
  const dia = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate()
  ).padStart(2, '0')}`;
  return `${dia} ${hora}`;
};

it('el resumen descuenta los ml devueltos por una venta anulada de hoy', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const antes = await obtenerResumenShots();

    const hoy = await inicioDelDia();
    const venta = await insertarMovimiento('venta', 500, `${hoy} 10:00:00`);
    await insertarMovimiento('devolucion', 200, `${hoy} 11:00:00`, venta);

    const despues = await obtenerResumenShots();
    expect(despues.mlServidosHoy - antes.mlServidosHoy).toBe(300);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('la anulación de una venta de ayer no baja los ml de hoy', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const antes = await obtenerResumenShots();

    const hoy = await inicioDelDia();
    const ventaAyer = await insertarMovimiento('venta', 700, ayerA('10:00:00'));
    await insertarMovimiento('devolucion', 300, `${hoy} 11:00:00`, ventaAyer);

    const despues = await obtenerResumenShots();
    expect(despues.mlServidosHoy - antes.mlServidosHoy).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('una venta sin anular suma sus ml al resumen', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const antes = await obtenerResumenShots();

    const hoy = await inicioDelDia();
    await insertarMovimiento('venta', 250, `${hoy} 10:00:00`);

    const despues = await obtenerResumenShots();
    expect(despues.mlServidosHoy - antes.mlServidosHoy).toBe(250);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
