import { afterAll, expect, it } from 'vitest';

import db, { query } from '@/lib/database/db';
import { restoreDatabase, snapshotDatabase } from '@/lib/database/maintenance';
import { fechaDeNegocio } from '@/lib/business/timezoneService';
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
  movimiento_origen?: string,
  producto_id?: string
): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO inventario_movimientos
       (id, tipo, estado, producto_id, presentacion_id, cantidad, precio_venta, comision,
        usuario_id, ml, fecha_crea${movimiento_origen ? ', movimiento_origen' : ''})
     VALUES (?, ?, 'completada', ?, NULL, 0, 0, 0, NULL, ?, ?${movimiento_origen ? ', ?' : ''})`,
    movimiento_origen
      ? [id, tipo, producto_id ?? null, ml, fecha_crea, movimiento_origen]
      : [id, tipo, producto_id ?? null, ml, fecha_crea]
  );
  return id;
}

/** Producto de prueba, para colgar los movimientos. */
async function crearProducto(nombre: string): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, fecha_crea)
     VALUES (?, ?, ?, 45000, 0, now())`,
    [id, `PRB${id.slice(0, 8)}`, nombre]
  );
  return id;
}

/**
 * Día de negocio, el mismo que usa la consulta del resumen. No sirve `now()`:
 * el runner y la zona del negocio pueden estar en días distintos y el corte
 * quedaría en el día equivocado.
 */
const inicioDelDia = () => fechaDeNegocio();

/**
 * Marca de tiempo de ayer **según el día de negocio**, en la misma hora del
 * caso. Se calcula sobre el texto de la fecha, sin `new Date()` local, para que
 * la zona del runner no mueva el día.
 */
const ayerA = (hora: string) => {
  const [anio, mes, dia] = fechaDeNegocio().split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return `${fecha.toISOString().slice(0, 10)} ${hora}`;
};

it('el resumen descuenta los ml devueltos por una venta anulada de hoy', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const antes = await obtenerResumenShots();

    const hoy = inicioDelDia();
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

    const hoy = inicioDelDia();
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

    const hoy = inicioDelDia();
    await insertarMovimiento('venta', 250, `${hoy} 10:00:00`);

    const despues = await obtenerResumenShots();
    expect(despues.mlServidosHoy - antes.mlServidosHoy).toBe(250);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('la anulación descuenta igual si el producto se desactivó después de vender', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const antes = await obtenerResumenShots();

    const hoy = inicioDelDia();
    const producto = await crearProducto('Producto que se desactiva');
    const venta = await insertarMovimiento('venta', 500, `${hoy} 10:00:00`, undefined, producto);

    // La bebida se desactiva a mano después de la venta: ya no se vende, pero la
    // venta que ya ocurrió sigue siendo la que hay que revertir.
    await query('UPDATE productos SET estado = 0 WHERE id_producto = ?', [producto]);
    await insertarMovimiento('devolucion', 200, `${hoy} 11:00:00`, venta, producto);

    const despues = await obtenerResumenShots();
    expect(despues.mlServidosHoy - antes.mlServidosHoy).toBe(300);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
