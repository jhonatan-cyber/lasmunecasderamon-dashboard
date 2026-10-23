/**
 * Lecturas de la barra: stock abierto y resumen del turno. Infraestructura
 * privada del módulo (§5): nada fuera de `modules/inventario` importa este
 * archivo. SQL movido 1:1 desde `lib/repositories/inventory/BarQueries.ts`.
 */
import { query, withTransaction } from '@/lib/database/db';
import { getBarMlConfig, getTopeSimple } from '../bar/configuracion';
import { mapPresentacion } from '../helpers';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from '../estados';
import type { MlServidoPorProductoHoy, ShotsSummary } from '../contracts';
import { listarCortosServidosHoy } from './cortosRepositorio';
import { listarColacionesServidasHoy } from './colacionesRepositorio';
import type { PresentacionRow } from '../tipos';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

/**
 * `productos.max_anfitrionas` puede no existir si falta la migración 017: se
 * carga aparte y tolerante para no romper el listado del bar.
 */
export async function obtenerMaxAnfitrionasPorProducto(
  productoIds: string[]
): Promise<Record<string, number | null>> {
  const ids = [...new Set(productoIds.filter(Boolean))];
  if (ids.length === 0) return {};
  try {
    const placeholders = ids.map(() => '?').join(',');
    const rows = await query<any[]>(
      `SELECT id_producto AS producto_id, max_anfitrionas FROM productos WHERE id_producto IN (${placeholders})`,
      ids
    );
    const map: Record<string, number | null> = {};
    for (const r of rows) {
      map[String(r.producto_id)] =
        r.max_anfitrionas === null || r.max_anfitrionas === undefined
          ? null
          : Number(r.max_anfitrionas);
    }
    return map;
  } catch {
    return {};
  }
}

export async function listarStockBar(
  productoId?: string,
  soloAcompanamientos = false
): Promise<
  (PresentacionRow & {
    producto_nombre: string;
    stock_bar_cerrado: number;
    producto_codigo: string;
    codigos_unidades_bar: string[];
    producto_foto: string | null;
    categoria_nombre: string | null;
    botellas_vacias_shots: number;
    botellas_abiertas: NonNullable<PresentacionRow['botellas_abiertas']>;
    botellas_por_devolver: NonNullable<PresentacionRow['botellas_por_devolver']>;
  })[]
> {
  const { mermaShotsMl } = await getBarMlConfig();
  const rows = await query<any[]>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'almacen') AS stock,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.ubicacion = 'bar' AND u.abierta_por_shots = true AND u.fecha_devolucion IS NULL AND (u.estado = '${ESTADO_UNIDAD_VENDIDA}' OR (u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ml_restante IS NOT NULL AND u.ml_restante >= 0 AND u.ml_restante <= ?))) AS botellas_vacias_shots,
      (SELECT COALESCE(SUM(u.ml_restante), 0) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS ml_abierta,
      (SELECT COALESCE(SUM(m.ml), 0) FROM inventario_movimientos m WHERE m.presentacion_id = p.id AND m.tipo = 'venta' AND m.ml > 0) AS ml_servidos,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar' AND COALESCE(u.ml_restante,0) = 0 AND u.abierta_por_shots IS NOT TRUE) AS stock_bar_cerrado,
      ARRAY(SELECT DISTINCT codigo FROM (
        SELECT u.codigo FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar' AND COALESCE(u.ml_restante, 0) = 0 AND u.abierta_por_shots IS NOT TRUE
        UNION
        SELECT u.codigo_barras AS codigo FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar' AND COALESCE(u.ml_restante, 0) = 0 AND u.abierta_por_shots IS NOT TRUE
      ) codigos WHERE codigo IS NOT NULL AND codigo <> '') AS codigos_unidades_bar,
      pr.nombre AS producto_nombre, pr.codigo AS producto_codigo, pr.foto AS producto_foto,
      pr.precio AS producto_precio, pr.comision AS producto_comision, pr.ml_shot,
      pr.ml_shot_anfitriona,
      c.nombre AS categoria_nombre
     FROM inventario_presentaciones p
     INNER JOIN productos pr ON pr.id_producto = p.producto_id
     LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
     WHERE 1 = 1
     ${productoId ? 'AND p.producto_id = ?' : ''}
     ${soloAcompanamientos ? "AND c.system_key = 'bebidas_analcoholicas' AND c.estado = 1 AND pr.estado = 1" : ''}
     ORDER BY CASE WHEN p.bar_display_order = 0 THEN 1 ELSE 0 END,
              p.bar_display_order ASC, pr.nombre ASC, p.fecha_crea ASC, p.id ASC`,
    productoId ? [mermaShotsMl, productoId] : [mermaShotsMl]
  );
  const maxMap = await obtenerMaxAnfitrionasPorProducto([
    ...new Set(rows.map(r => String(r.producto_id)).filter(Boolean))
  ]);
  const presentacionIds = rows.map(row => String(row.id)).filter(Boolean);
  const botellasPorPresentacion = new Map<
    string,
    NonNullable<PresentacionRow['botellas_abiertas']>
  >();
  const botellasPendientesPorPresentacion = new Map<
    string,
    NonNullable<PresentacionRow['botellas_por_devolver']>
  >();
  if (presentacionIds.length > 0) {
    const placeholders = presentacionIds.map(() => '?').join(',');
    const unidades = await query<any[]>(
      `SELECT id, presentacion_id, codigo, codigo_barras, ml_restante, estado, abierta_por_shots
         FROM inventario_unidades
        WHERE presentacion_id IN (${placeholders})
          AND ubicacion = 'bar'
          AND ((estado = '${ESTADO_UNIDAD_ACTIVA}' AND COALESCE(ml_restante, 0) > 0)
            OR (abierta_por_shots = true AND fecha_devolucion IS NULL
              AND (estado = '${ESTADO_UNIDAD_VENDIDA}'
                OR (estado = '${ESTADO_UNIDAD_ACTIVA}' AND ml_restante IS NOT NULL AND ml_restante >= 0 AND ml_restante <= ?))))
        ORDER BY presentacion_id, fecha_crea, codigo`,
      [...presentacionIds, mermaShotsMl]
    );
    for (const unidad of unidades) {
      const id = String(unidad.presentacion_id);
      const mlRestante = Number(unidad.ml_restante ?? 0);
      if (unidad.estado === ESTADO_UNIDAD_ACTIVA && mlRestante > 0) {
        const detalleAbiertas = botellasPorPresentacion.get(id) ?? [];
        detalleAbiertas.push({
          id: String(unidad.id),
          codigo: String(unidad.codigo),
          codigo_barras: unidad.codigo_barras ?? null,
          ml_restante: mlRestante
        });
        botellasPorPresentacion.set(id, detalleAbiertas);
      }
      if (
        unidad.abierta_por_shots === true &&
        (unidad.estado === ESTADO_UNIDAD_VENDIDA ||
          (unidad.estado === ESTADO_UNIDAD_ACTIVA &&
            unidad.ml_restante !== null &&
            mlRestante >= 0 &&
            mlRestante <= mermaShotsMl))
      ) {
        const detallePendientes = botellasPendientesPorPresentacion.get(id) ?? [];
        detallePendientes.push({
          id: String(unidad.id),
          codigo: String(unidad.codigo),
          codigo_barras: unidad.codigo_barras ?? null,
          ml_restante: mlRestante
        });
        botellasPendientesPorPresentacion.set(id, detallePendientes);
      }
    }
  }
  const topeSimple = await getTopeSimple();
  return rows.map(row => ({
    ...mapPresentacion(
      { ...row, max_anfitrionas: maxMap[String(row.producto_id)] ?? null },
      topeSimple
    ),
    stock_bar_cerrado: Number(row.stock_bar_cerrado || 0),
    producto_nombre: row.producto_nombre,
    producto_codigo: row.producto_codigo,
    codigos_unidades_bar: row.codigos_unidades_bar ?? [],
    producto_foto: row.producto_foto ?? null,
    categoria_nombre: row.categoria_nombre ?? null,
    botellas_vacias_shots: Number(row.botellas_vacias_shots ?? 0),
    botellas_abiertas: botellasPorPresentacion.get(String(row.id)) ?? [],
    botellas_por_devolver: botellasPendientesPorPresentacion.get(String(row.id)) ?? []
  }));
}

/**
 * Guarda el orden manual del listado del bar. Se escribe completo y dentro de
 * una transacción: si se cortara a mitad, cada puesto vería una barra distinta.
 * El último valor de un id repetido gana, así una petición con duplicados no
 * deja filas a medio mover.
 */
export async function reordenarStockBar(
  presentaciones: { id: string; orden: number }[]
): Promise<void> {
  const ordenPorPresentacion = new Map(presentaciones.map(p => [p.id, p.orden]));
  if (ordenPorPresentacion.size === 0) return;
  await withTransaction(async trx => {
    for (const [id, orden] of ordenPorPresentacion) {
      await trx('UPDATE inventario_presentaciones SET bar_display_order = ? WHERE id = ?', [
        orden,
        id
      ]);
    }
  });
}

/**
 * Ml servidos hoy por producto: lo que salió por ventas (incluye los ml del
 * acompañamiento) más las colaciones, menos lo que volvió al bar por una
 * anulación. La reversión se imputa al producto de su movimiento de origen
 * (`movimiento_origen`) y solo si esa venta es de hoy: una venta anulada de
 * ayer no toca el resumen de hoy.
 *
 * Esta consulta es la fuente de `mlServidosHoy`, así que la suma del desglose
 * por producto coincide siempre con el total que muestra la tarjeta.
 */
export async function listarMlServidoPorProductoHoy(): Promise<MlServidoPorProductoHoy[]> {
  const inicioDia = `${getNowInBusinessTimezone().slice(0, 10)} 00:00:00`;
  const rows = await query<any[]>(
    `WITH consumos AS (
        SELECT m.producto_id, m.ml, 0 AS ml_colacion
          FROM inventario_movimientos m
         WHERE m.tipo = 'venta' AND m.ml > 0 AND m.fecha_crea >= ?
        UNION ALL
        SELECT o.producto_id, -r.ml, 0
          FROM inventario_movimientos r
          INNER JOIN inventario_movimientos o ON o.id = r.movimiento_origen
         WHERE r.tipo = 'devolucion' AND r.ml > 0
           AND o.tipo = 'venta' AND o.fecha_crea >= ?
        UNION ALL
        SELECT m.producto_id, m.ml, m.ml
          FROM inventario_movimientos m
         WHERE m.tipo = 'colacion' AND m.ml > 0 AND m.fecha_crea >= ?
     )
     SELECT c.producto_id,
            COALESCE(pr.nombre, 'Bebida sin nombre') AS producto_nombre,
            SUM(c.ml)::int AS ml,
            SUM(c.ml_colacion)::int AS ml_colacion
       FROM consumos c
       LEFT JOIN productos pr ON pr.id_producto = c.producto_id
      GROUP BY c.producto_id, pr.nombre
     HAVING SUM(c.ml) <> 0
      ORDER BY SUM(c.ml) DESC, pr.nombre ASC`,
    [inicioDia, inicioDia, inicioDia]
  );
  return rows.map(row => ({
    producto_id: row.producto_id == null ? '' : String(row.producto_id),
    producto_nombre: String(row.producto_nombre ?? 'Bebida sin nombre'),
    ml: Number(row.ml ?? 0),
    ml_colacion: Number(row.ml_colacion ?? 0)
  }));
}

/**
 * Resumen para el panel de shots del bar: lo servido hoy, los ml que quedan en las
 * botellas abiertas y cuántas están por agotarse (≤ `shots_alerta` shots restantes).
 *
 * Los ml servidos salen de los movimientos (incluyen el acompañamiento), pero los
 * cortos se cuentan desde `detalle_ventas`: dividir los ml por el shot no distingue
 * un corto de una botella con bebida y además suma los ml del acompañamiento.
 * `shotsServidosHoy` se deriva de `cortosHoy` para que el stat y su detalle coincidan.
 */
export async function obtenerResumenShots(): Promise<ShotsSummary> {
  const { shotMl, shotsAlerta } = await getBarMlConfig();
  // La suma de este desglose es, por construcción, `mlServidosHoy`.
  const mlPorProductoHoy = await listarMlServidoPorProductoHoy();
  const mlServidosHoy = mlPorProductoHoy.reduce((total, producto) => total + producto.ml, 0);
  const [abiertas] = await query<any[]>(
    `SELECT COUNT(*) AS botellas,
            COALESCE(SUM(u.ml_restante), 0) AS ml,
            COALESCE(SUM(CASE WHEN u.ml_restante <= (COALESCE(NULLIF(pr.ml_shot, 0), ?) * ?)
                             THEN 1 ELSE 0 END), 0) AS por_agotarse
       FROM inventario_unidades u
       LEFT JOIN productos pr ON pr.id_producto = u.producto_id
      WHERE u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar' AND u.ml_restante > 0`,
    [shotMl, shotsAlerta]
  );

  const cortosHoy = await listarCortosServidosHoy(shotMl);
  // Las colaciones salen de la misma fuente que sus ml: el detalle del stat
  // explica exactamente los ml que muestra la tarjeta, sin cruzar el módulo
  // Colaciones (que registra la colación, no el consumo de stock).
  const colacionesHoy = await listarColacionesServidasHoy();
  const mlColacionHoy = colacionesHoy.reduce((total, colacion) => total + colacion.ml, 0);
  return {
    shotMl,
    shotsAlerta,
    mlServidosHoy,
    mlColacionHoy,
    shotsServidosHoy: cortosHoy.reduce((total, corto) => total + corto.cantidad, 0),
    cortosHoy,
    colacionesHoy,
    mlPorProductoHoy,
    mlRestantesTotales: Number(abiertas?.ml ?? 0),
    botellasAbiertas: Number(abiertas?.botellas ?? 0),
    botellasPorAgotarse: Number(abiertas?.por_agotarse ?? 0)
  };
}
