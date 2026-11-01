/**
 * Lotes vencidos: las unidades activas cuyo vencimiento ya pasó. Infraestructura
 * privada del módulo: nadie fuera de `modules/inventario` importa este archivo (§5).
 *
 * El vencimiento que aplica a cada unidad es el de su lote; si la unidad no lo
 * tiene (las anteriores a la migración 111) se aplica el de su presentación.
 * Las dos referencias se resuelven en SQL con `COALESCE`, que es la misma regla
 * que aplica `lib/business/vencimiento` en el servidor.
 */
import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { hoyDelNegocio } from '@/lib/business/vencimiento';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { NotFoundError } from '@/lib/errors/errors';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_INACTIVA } from '../estados';
import type { BajaVencidoResultado, LoteVencido } from '../contracts';

/** Vencimiento que aplica a la unidad: el de su lote o, si no lo tiene, el de la presentación. */
const VENCIMIENTO_UNIDAD = 'COALESCE(u.fecha_vencimiento, p.fecha_vencimiento)';

/**
 * Presentaciones con stock vencido: qué hay que dar de baja y cuántos ml se van.
 */
export async function listarLotesVencidos(): Promise<LoteVencido[]> {
  const hoy = hoyDelNegocio();
  const rows = await query<any[]>(
    `SELECT p.id AS presentacion_id, p.producto_id,
      pr.nombre AS producto, p.nombre AS presentacion,
      MIN(${VENCIMIENTO_UNIDAD})::text AS fecha_vencimiento,
      COUNT(*)::int AS unidades_vencidas,
      COUNT(*) FILTER (WHERE u.ubicacion = 'almacen')::int AS unidades_bodega,
      COUNT(*) FILTER (WHERE u.ubicacion = 'bar')::int AS unidades_bar,
      COALESCE(SUM(u.ml_restante), 0)::int AS ml_abiertos
     FROM inventario_unidades u
     JOIN inventario_presentaciones p ON p.id = u.presentacion_id
     JOIN productos pr ON pr.id_producto = p.producto_id
     WHERE u.estado = '${ESTADO_UNIDAD_ACTIVA}'
       AND ${VENCIMIENTO_UNIDAD} IS NOT NULL
       AND ${VENCIMIENTO_UNIDAD} < ?
     GROUP BY p.id, pr.nombre
     ORDER BY MIN(${VENCIMIENTO_UNIDAD}) ASC, p.nombre ASC`,
    [hoy]
  );
  return rows.map(row => ({
    presentacion_id: String(row.presentacion_id),
    producto_id: String(row.producto_id),
    producto: String(row.producto ?? ''),
    presentacion: String(row.presentacion ?? ''),
    fecha_vencimiento: row.fecha_vencimiento ? String(row.fecha_vencimiento) : null,
    unidades_vencidas: Number(row.unidades_vencidas ?? 0),
    unidades_bodega: Number(row.unidades_bodega ?? 0),
    unidades_bar: Number(row.unidades_bar ?? 0),
    ml_abiertos: Number(row.ml_abiertos ?? 0)
  }));
}

/**
 * Da de baja el stock vencido de una presentación y deja constancia en el
 * historial: las unidades pasan a `inactivo` y se registra un movimiento de
 * tipo `merma` con cuántas botellas salieron y cuántos ml se perdieron.
 *
 * La baja es por lote vencido, no manual: se lleva las unidades cuyo
 * vencimiento ya pasó y sólo ésas, así que un lote nuevo de la misma
 * presentación no se ve afectado.
 */
export async function darDeBajaLoteVencido(
  trx: TransactionQuery,
  presentacionId: string,
  usuarioId: string,
  nota?: string | null
): Promise<BajaVencidoResultado> {
  const hoy = hoyDelNegocio();
  const vencidas = await trx<
    {
      id: string;
      producto_id: string;
      producto: string;
      presentacion: string;
      ml_restante: number | null;
      fecha_vencimiento: string | null;
    }[]
  >(
    `SELECT u.id, p.producto_id, pr.nombre AS producto, p.nombre AS presentacion,
      u.ml_restante, ${VENCIMIENTO_UNIDAD}::text AS fecha_vencimiento
       FROM inventario_unidades u
       JOIN inventario_presentaciones p ON p.id = u.presentacion_id
       JOIN productos pr ON pr.id_producto = p.producto_id
      WHERE u.presentacion_id = ? AND u.estado = '${ESTADO_UNIDAD_ACTIVA}'
        AND ${VENCIMIENTO_UNIDAD} IS NOT NULL
        AND ${VENCIMIENTO_UNIDAD} < ?
      ORDER BY ${VENCIMIENTO_UNIDAD} ASC, u.fecha_crea ASC, u.codigo ASC
      FOR UPDATE OF u`,
    [presentacionId, hoy]
  );
  if (!vencidas.length) throw new NotFoundError('Lote vencido');

  const ids = vencidas.map(unidad => unidad.id);
  const placeholders = ids.map(() => '?').join(',');
  await trx(
    `UPDATE inventario_unidades SET estado = '${ESTADO_UNIDAD_INACTIVA}' WHERE id IN (${placeholders})`,
    ids
  );

  // Los ml que se pierden son los que quedaban abiertos en el bar: una
  // botella cerrada no tiene ml que contar, sale entera.
  const ml = vencidas.reduce(
    (total, unidad) => total + Math.max(0, Math.floor(Number(unidad.ml_restante ?? 0))),
    0
  );
  const movimientoId = generateUUID();
  const fecha = getNowInBusinessTimezone();
  const productoId = vencidas[0].producto_id;
  await trx(
    `INSERT INTO inventario_movimientos
      (id, tipo, estado, producto_id, presentacion_id, cantidad, precio_venta, comision, usuario_id, ml, nota, fecha_crea)
     VALUES (?, 'merma', 'completada', ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
    [
      movimientoId,
      productoId,
      presentacionId,
      vencidas.length,
      usuarioId,
      ml,
      nota?.trim() || null,
      fecha
    ]
  );
  // Cada botella dada de baja queda en el historial: el movimiento dice qué
  // salió del inventario, no sólo cuántas unidades fueron.
  const valores = vencidas.flatMap(unidad => [
    movimientoId,
    unidad.id,
    Math.max(0, Math.floor(Number(unidad.ml_restante ?? 0)))
  ]);
  const marcadores = vencidas.map(() => '(?, ?, ?)').join(',');
  await trx(
    `INSERT INTO inventario_movimiento_unidades (movimiento_id, unidad_id, ml_consumido)
     VALUES ${marcadores}`,
    valores
  );

  return {
    presentacion_id: presentacionId,
    producto_id: productoId,
    producto: vencidas[0].producto,
    presentacion: vencidas[0].presentacion,
    unidades: vencidas.length,
    ml,
    fecha_vencimiento: vencidas[0].fecha_vencimiento
  };
}
