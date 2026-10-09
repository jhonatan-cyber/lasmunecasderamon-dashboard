/**
 * Lecturas de la barra: stock abierto y resumen del turno. Infraestructura
 * privada del módulo (§5): nada fuera de `modules/inventario` importa este
 * archivo. SQL movido 1:1 desde `lib/repositories/inventory/BarQueries.ts`.
 */
import { query } from '@/lib/database/db';
import { getBarMlConfig, getTopeSimple } from '../bar/configuracion';
import { mapPresentacion } from '../helpers';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from '../estados';
import type { ShotsSummary } from '../contracts';
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

export async function listarStockBar(productoId?: string): Promise<
  (PresentacionRow & {
    producto_nombre: string;
    producto_codigo: string;
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
      pr.nombre AS producto_nombre, pr.codigo AS producto_codigo, pr.foto AS producto_foto,
      pr.precio AS producto_precio, pr.comision AS producto_comision, pr.ml_shot,
      pr.ml_shot_anfitriona,
      c.nombre AS categoria_nombre
     FROM inventario_presentaciones p
     INNER JOIN productos pr ON pr.id_producto = p.producto_id
     LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
     ${productoId ? 'WHERE p.producto_id = ?' : ''}
     ORDER BY pr.nombre ASC, p.fecha_crea ASC, p.id ASC`,
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
    producto_nombre: row.producto_nombre,
    producto_codigo: row.producto_codigo,
    producto_foto: row.producto_foto ?? null,
    categoria_nombre: row.categoria_nombre ?? null,
    botellas_vacias_shots: Number(row.botellas_vacias_shots ?? 0),
    botellas_abiertas: botellasPorPresentacion.get(String(row.id)) ?? [],
    botellas_por_devolver: botellasPendientesPorPresentacion.get(String(row.id)) ?? []
  }));
}

/**
 * Resumen para el panel de shots del bar: lo servido hoy, los ml que quedan en las
 * botellas abiertas y cuántas están por agotarse (≤ `shots_alerta` shots restantes).
 *
 * Los ml por shot pueden variar por producto (`productos.ml_shot`): los conteos se
 * calculan producto por producto y sólo se recurre al `shot_ml` global cuando el
 * producto no define los suyos.
 */
export async function obtenerResumenShots(): Promise<ShotsSummary> {
  const { shotMl, shotsAlerta } = await getBarMlConfig();
  const inicioDia = `${getNowInBusinessTimezone().slice(0, 10)} 00:00:00`;

  const [hoy] = await query<any[]>(
    `SELECT COALESCE(SUM(m.ml), 0) AS ml,
            COALESCE(SUM(m.ml / COALESCE(NULLIF(pr.ml_shot, 0), ?)), 0) AS shots
       FROM inventario_movimientos m
       LEFT JOIN productos pr ON pr.id_producto = m.producto_id
      WHERE m.tipo = 'venta' AND m.ml > 0 AND m.fecha_crea >= ?`,
    [shotMl, inicioDia]
  );
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

  const mlServidosHoy = Number(hoy?.ml ?? 0);
  return {
    shotMl,
    shotsAlerta,
    mlServidosHoy,
    shotsServidosHoy: Number(hoy?.shots ?? 0),
    mlRestantesTotales: Number(abiertas?.ml ?? 0),
    botellasAbiertas: Number(abiertas?.botellas ?? 0),
    botellasPorAgotarse: Number(abiertas?.por_agotarse ?? 0)
  };
}
