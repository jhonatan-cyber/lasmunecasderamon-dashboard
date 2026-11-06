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
import type { VencidoRetirado } from '../contracts';

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
      ARRAY_AGG(DISTINCT u.codigo ORDER BY u.codigo) AS codigos,
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
    ml_abiertos: Number(row.ml_abiertos ?? 0),
    codigos: Array.isArray(row.codigos) ? row.codigos.map((codigo: unknown) => String(codigo)) : []
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
  nota?: string | null,
  ubicacionOrigen: 'almacen' | 'bar' | 'ambos' = 'ambos'
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
      ubicacion: string;
      codigo: string;
      codigo_barras: string | null;
      compra_id: string | null;
      compra_folio: string | null;
      fecha_adquisicion: string | null;
      fecha_elaboracion: string | null;
      duracion_meses: number | null;
      precio_adquisicion: number;
    }[]
  >(
    `SELECT u.id, p.producto_id, pr.nombre AS producto, p.nombre AS presentacion,
      u.ml_restante, u.ubicacion, u.codigo, u.codigo_barras,
      u.compra_id, c.folio AS compra_folio, c.fecha_crea AS fecha_adquisicion,
      dc.fecha_elaboracion, dc.duracion_meses, dc.precio_compra AS precio_adquisicion,
      ${VENCIMIENTO_UNIDAD}::text AS fecha_vencimiento
       FROM inventario_unidades u
       JOIN inventario_presentaciones p ON p.id = u.presentacion_id
       JOIN productos pr ON pr.id_producto = p.producto_id
       LEFT JOIN compras c ON c.id = u.compra_id
       LEFT JOIN detalle_compras dc ON dc.compra_id = u.compra_id AND dc.presentacion_id = u.presentacion_id
      WHERE u.presentacion_id = ? AND u.estado = '${ESTADO_UNIDAD_ACTIVA}'
        AND ${VENCIMIENTO_UNIDAD} IS NOT NULL
        AND ${VENCIMIENTO_UNIDAD} < ?
        AND (? = 'ambos' OR u.ubicacion = ?)
      ORDER BY ${VENCIMIENTO_UNIDAD} ASC, u.fecha_crea ASC, u.codigo ASC
      FOR UPDATE OF u`,
    [presentacionId, hoy, ubicacionOrigen, ubicacionOrigen]
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

  const [usuario] = await trx<{ nombre: string | null }[]>(
    `SELECT COALESCE(nick, nombre) AS nombre FROM usuarios WHERE id_usuario = ? LIMIT 1`,
    [usuarioId]
  );
  const retiroIdRows = vencidas
    .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .join(',');
  const retiroValores = vencidas.flatMap(unidad => [
    generateUUID(),
    unidad.id,
    unidad.codigo,
    unidad.codigo_barras ?? null,
    unidad.producto_id,
    presentacionId,
    unidad.producto,
    unidad.presentacion,
    unidad.ubicacion,
    unidad.fecha_vencimiento ?? null,
    getNowInBusinessTimezone(),
    usuarioId,
    usuario?.nombre ?? null,
    unidad.compra_id ?? null,
    unidad.compra_folio ?? null,
    unidad.fecha_adquisicion ?? null,
    unidad.fecha_elaboracion ?? null,
    unidad.duracion_meses ?? null,
    Math.max(0, Number(unidad.precio_adquisicion ?? 0)),
    Math.max(0, Number(unidad.precio_adquisicion ?? 0)),
    nota?.trim() || null
  ]);
  await trx(
    `INSERT INTO inventario_vencidos_retirados
      (id, unidad_id, codigo, codigo_barras, producto_id, presentacion_id,
       producto_nombre, presentacion_nombre, ubicacion_origen, fecha_vencimiento,
       fecha_retiro, usuario_id, usuario_nombre, compra_id, compra_folio,
       fecha_adquisicion, fecha_elaboracion, duracion_meses, precio_adquisicion, valor_retirado, nota)
     VALUES ${retiroIdRows}`,
    retiroValores
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

export async function listarVencidosRetirados(
  ubicacionOrigen?: 'almacen' | 'bar',
  limit = 500
): Promise<VencidoRetirado[]> {
  const filtro = ubicacionOrigen ? 'WHERE ubicacion_origen = ?' : '';
  const params: any[] = ubicacionOrigen ? [ubicacionOrigen, limit] : [limit];
  const rows = await query<any[]>(
    `SELECT * FROM inventario_vencidos_retirados
     ${filtro}
     ORDER BY fecha_retiro DESC, codigo ASC
     LIMIT ?`,
    params
  );
  return rows.map(row => ({
    id: String(row.id),
    unidad_id: String(row.unidad_id),
    codigo: String(row.codigo ?? ''),
    codigo_barras: row.codigo_barras ? String(row.codigo_barras) : null,
    producto_id: row.producto_id ? String(row.producto_id) : null,
    presentacion_id: row.presentacion_id ? String(row.presentacion_id) : null,
    producto_nombre: String(row.producto_nombre ?? 'Producto eliminado'),
    presentacion_nombre: String(row.presentacion_nombre ?? 'Presentación eliminada'),
    ubicacion_origen: row.ubicacion_origen === 'bar' ? 'bar' : 'almacen',
    fecha_vencimiento: row.fecha_vencimiento ? String(row.fecha_vencimiento).slice(0, 10) : null,
    fecha_retiro: String(row.fecha_retiro ?? ''),
    usuario_nombre: row.usuario_nombre ? String(row.usuario_nombre) : null,
    compra_id: row.compra_id ? String(row.compra_id) : null,
    compra_folio: row.compra_folio ? String(row.compra_folio) : null,
    fecha_adquisicion: row.fecha_adquisicion ? String(row.fecha_adquisicion) : null,
    fecha_elaboracion: row.fecha_elaboracion ? String(row.fecha_elaboracion).slice(0, 10) : null,
    duracion_meses:
      row.duracion_meses === null || row.duracion_meses === undefined
        ? null
        : Number(row.duracion_meses),
    precio_adquisicion: Number(row.precio_adquisicion ?? row.valor_retirado ?? 0),
    valor_retirado: Number(row.valor_retirado ?? row.precio_adquisicion ?? 0),
    nota: row.nota ? String(row.nota) : null
  }));
}
