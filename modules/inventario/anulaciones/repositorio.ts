/**
 * Reversión del consumo de stock cuando se anula una venta. Infraestructura
 * privada del módulo: nadie fuera de `modules/inventario` importa este
 * archivo (§5).
 *
 * Qué resuelve
 *   Anular una venta devolvía la plata y se quedaba con las botellas. Como el
 *   consumo no anotaba la venta ni las unidades que tocó (migración 058), la
 *   única manera exacta de devolver lo que salió es seguir la cadena que dejó
 *   el propio consumo: `inventario_movimientos.venta_id` dice qué venta vació
 *   el stock, `inventario_movimiento_unidades` dice qué botellas tocó y cuánta
 *   ml les quitó, y cada movimiento de reversión apunta con `movimiento_origen`
 *   al consumo que deshace.
 *
 * Idempotencia por suma, no por bandera
 *   Un movimiento está devuelto cuando lo ya revertido alcanza lo que consumió,
 *   y eso lo contesta la suma de sus reversiones. Una venta anulada dos veces
 *   (parcial y luego total) repone cada botella una sola vez, sin columna que
 *   pueda quedar desincronizada ni condición de carrera entre ambos caminos.
 *
 * Qué no hace
 *   No lanza si no encuentra qué reponer. Anular una venta no puede fallar
 *   porque el stock no cuadre: se devuelve lo que se puede demostrar y el resto
 *   se reporta en `ml_no_repuesto` para que quede a la vista.
 */
import { generateUUID, type TransactionQuery } from '@/lib/database/db';
import { DEFAULT_BOTTLE_ML, getBarMlConfig } from '../bar/configuracion';
import { resolveBotellaMl } from '@/lib/business/shotMl';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from '../estados';
import type { AnulacionStockEntrada, ReversaStockAnulacion } from '../contracts';

/** Consumo de una venta pendiente de devolver, con lo ya devuelto antes. */
interface MovimientoVenta {
  id: string;
  producto_id: string | null;
  presentacion_id: string | null;
  nombre: string | null;
  cantidad: number;
  ml: number | null;
  precio_venta: number | null;
  comision: number | null;
  ml_botella: number | null;
  unidades_revertidas: number;
  ml_revertido: number;
}

/** Una unidad que el consumo tocó, con lo que le quitó. */
interface UnidadTocada {
  id: string;
  ml_restante: number | null;
  estado: string;
  ml_consumido: number;
}

export async function revertirStockPorAnulacion(
  trx: TransactionQuery,
  entrada: AnulacionStockEntrada
): Promise<ReversaStockAnulacion> {
  const resultado: ReversaStockAnulacion = {
    movimientos_revertidos: 0,
    unidades_repuestas: 0,
    ml_repuesto: 0,
    ml_no_repuesto: 0
  };

  const fraccion = Math.min(1, Math.max(0, Number(entrada.fraccion ?? 1)));
  if (!entrada.venta_id || fraccion <= 0) return resultado;

  const movimientos = await trx<MovimientoVenta[]>(
    `SELECT m.id, m.producto_id, m.presentacion_id, p.nombre, m.cantidad, m.ml,
            m.precio_venta, m.comision, p.ml_botella,
            COALESCE((SELECT SUM(r.cantidad) FROM inventario_movimientos r
                       WHERE r.movimiento_origen = m.id), 0) AS unidades_revertidas,
            COALESCE((SELECT SUM(COALESCE(r.ml, 0)) FROM inventario_movimientos r
                       WHERE r.movimiento_origen = m.id), 0) AS ml_revertido
       FROM inventario_movimientos m
       INNER JOIN inventario_presentaciones p ON p.id = m.presentacion_id
      WHERE m.tipo = 'venta' AND m.venta_id = ?
      ORDER BY m.fecha_crea ASC, m.id ASC
      FOR UPDATE OF m`,
    [entrada.venta_id]
  );

  if (movimientos.length === 0) return resultado;

  const { botellaMl } = await getBarMlConfig(trx);

  for (const movimiento of movimientos) {
    const porReponer = Math.max(0, Math.round(Number(movimiento.cantidad || 0) * fraccion));
    const mlPorReponer = Math.max(0, Math.round(Number(movimiento.ml || 0) * fraccion));
    const unidadesDisponibles = Math.max(
      0,
      Number(movimiento.cantidad || 0) - Number(movimiento.unidades_revertidas || 0)
    );
    const mlDisponible = Math.max(
      0,
      Number(movimiento.ml || 0) - Number(movimiento.ml_revertido || 0)
    );
    const objetivoUnidades = Math.min(porReponer, unidadesDisponibles);
    const objetivoMl = Math.min(mlPorReponer, mlDisponible);
    if (objetivoUnidades === 0 && objetivoMl === 0) continue;

    const capacidad = resolveBotellaMl(
      movimiento.ml_botella,
      movimiento.nombre,
      botellaMl || DEFAULT_BOTTLE_ML
    );

    let mlRepuesto = 0;
    if (objetivoMl > 0) {
      const repuesto = await reponerMl(trx, movimiento.id, objetivoMl, capacidad);
      mlRepuesto = repuesto.repuesto;
      resultado.ml_no_repuesto += objetivoMl - repuesto.repuesto;
    }

    let unidadesRepuestas = 0;
    if (objetivoUnidades > 0) {
      unidadesRepuestas = await reponerBotellas(trx, movimiento.id, objetivoUnidades);
    }

    if (mlRepuesto === 0 && unidadesRepuestas === 0) continue;

    const revertido = {
      id: generateUUID(),
      tipo: 'devolucion',
      estado: 'completada',
      producto_id: movimiento.producto_id,
      presentacion_id: movimiento.presentacion_id,
      cantidad: unidadesRepuestas,
      ml: mlRepuesto > 0 ? mlRepuesto : null,
      precio_venta: movimiento.precio_venta,
      comision: movimiento.comision,
      usuario_id: entrada.usuario_id,
      venta_id: entrada.venta_id,
      movimiento_origen: movimiento.id,
      fecha_crea: entrada.fecha
    };
    const columnas = Object.keys(revertido);
    await trx(
      `INSERT INTO inventario_movimientos (${columnas.join(', ')})
       VALUES (${columnas.map(() => '?').join(', ')})`,
      Object.values(revertido)
    );

    resultado.movimientos_revertidos += 1;
    resultado.unidades_repuestas += unidadesRepuestas;
    resultado.ml_repuesto += mlRepuesto;
  }

  return resultado;
}

/**
 * Devuelve la ml a las botellas de las que salió.
 *
 * Primero las que el consumo vació o menguó (`ml_consumido > 0`), empezando por
 * las más vacías: así se deshace el consumo en el orden inverso al que lo hizo.
 * Si a esas botellas ya no les cabe (su capacidad cambió desde la venta), se
 * completa con las que el mismo movimiento vendió enteras, que vuelven al bar
 * abiertas y con su contenido. Lo que no quepa en ninguna se reporta.
 */
async function reponerMl(
  trx: TransactionQuery,
  movimientoId: string,
  pendiente: number,
  capacidad: number
): Promise<{ repuesto: number }> {
  const unidades = await trx<UnidadTocada[]>(
    `SELECT u.id, u.ml_restante, u.estado, mu.ml_consumido
       FROM inventario_unidades u
       INNER JOIN inventario_movimiento_unidades mu ON mu.unidad_id = u.id
      WHERE mu.movimiento_id = ? AND mu.ml_consumido > 0
      ORDER BY COALESCE(u.ml_restante, 0) ASC, u.id ASC
      FOR UPDATE OF u`,
    [movimientoId]
  );

  let repuesto = 0;
  for (const unidad of unidades) {
    if (repuesto >= pendiente) break;
    const actual = Math.floor(Number(unidad.ml_restante ?? 0));
    const cupo = Math.max(0, capacidad - actual);
    if (cupo <= 0) continue;
    const agregado = Math.min(cupo, pendiente - repuesto);
    await trx(
      `UPDATE inventario_unidades
          SET ml_restante = ?,
              estado = CASE WHEN estado = '${ESTADO_UNIDAD_VENDIDA}' THEN '${ESTADO_UNIDAD_ACTIVA}' ELSE estado END,
              ubicacion = 'bar'
        WHERE id = ?`,
      [actual + agregado, unidad.id]
    );
    repuesto += agregado;
  }

  if (repuesto >= pendiente) return { repuesto };

  const vendidas = await trx<UnidadTocada[]>(
    `SELECT u.id, u.ml_restante, u.estado, mu.ml_consumido
       FROM inventario_unidades u
       INNER JOIN inventario_movimiento_unidades mu ON mu.unidad_id = u.id
      WHERE mu.movimiento_id = ? AND mu.ml_consumido = 0
        AND u.estado = '${ESTADO_UNIDAD_VENDIDA}'
      ORDER BY u.fecha_crea DESC, u.codigo ASC
      FOR UPDATE OF u`,
    [movimientoId]
  );

  for (const unidad of vendidas) {
    if (repuesto >= pendiente) break;
    const actual = Math.floor(Number(unidad.ml_restante ?? 0));
    const agregado = Math.min(Math.max(0, capacidad - actual), pendiente - repuesto);
    if (agregado <= 0) continue;
    await trx(
      `UPDATE inventario_unidades
          SET ml_restante = ?,
              estado = CASE WHEN estado = '${ESTADO_UNIDAD_VENDIDA}' THEN '${ESTADO_UNIDAD_ACTIVA}' ELSE estado END,
              ubicacion = 'bar'
        WHERE id = ?`,
      [actual + agregado, unidad.id]
    );
    repuesto += agregado;
  }

  return { repuesto };
}

/**
 * Devuelve al bar las botellas que el consumo vendió enteras: las que salen son
 * las últimas de ese movimiento, que es el orden inverso al del consumo.
 */
async function reponerBotellas(
  trx: TransactionQuery,
  movimientoId: string,
  objetivo: number
): Promise<number> {
  const candidatas = await trx<{ id: string }[]>(
    `SELECT u.id
       FROM inventario_unidades u
       INNER JOIN inventario_movimiento_unidades mu ON mu.unidad_id = u.id
      WHERE mu.movimiento_id = ? AND mu.ml_consumido = 0
        AND u.estado = '${ESTADO_UNIDAD_VENDIDA}'
      ORDER BY u.fecha_crea DESC, u.codigo ASC
      LIMIT ?
      FOR UPDATE OF u`,
    [movimientoId, objetivo]
  );
  if (candidatas.length === 0) return 0;

  const ids = candidatas.map(unidad => unidad.id);
  const placeholders = ids.map(() => '?').join(',');
  await trx(
    `UPDATE inventario_unidades
        SET estado = '${ESTADO_UNIDAD_ACTIVA}', ubicacion = 'bar', ml_restante = 0
      WHERE id IN (${placeholders})`,
    ids
  );
  return ids.length;
}
