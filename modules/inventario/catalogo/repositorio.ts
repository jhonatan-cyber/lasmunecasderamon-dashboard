/**
 * Qué se puede vender ahora mismo: las presentaciones con stock activo, con su
 * precio ya resuelto por niveles. Infraestructura privada del módulo (§5).
 * SQL movido 1:1 desde `lib/repositories/inventory/CatalogoQueries.ts`.
 */
import { query } from '@/lib/database/db';
import { getTopeSimple } from '../bar/configuracion';
import { completarOpciones } from '@/lib/repositories/inventory/inventoryHelpers';
import { ESTADO_UNIDAD_ACTIVA } from '@/lib/repositories/inventory/inventoryHelpers';

export interface FiltrosParaVenta {
  category_id?: string;
  term?: string;
}

export async function listarParaVenta(filters?: FiltrosParaVenta): Promise<any[]> {
  const params: any[] = [];
  let whereCategoria = '';
  if (filters?.category_id) {
    whereCategoria = 'AND pr.categoria_id = ?';
    params.push(filters.category_id);
  }
  let whereTerm = '';
  const term = filters?.term?.trim();
  if (term) {
    const like = `%${term}%`;
    whereTerm =
      'AND (LOWER(pr.nombre) LIKE LOWER(?) OR LOWER(pr.codigo) LIKE LOWER(?) OR LOWER(p.nombre) LIKE LOWER(?) OR LOWER(p.codigo_barras) LIKE LOWER(?))';
    params.push(like, like, like, like);
  }
  const rows = await query<any[]>(
    `SELECT p.id AS presentacion_id, p.nombre AS presentacion_nombre,
      p.codigo_barras, p.foto AS presentacion_foto,
      p.precio_venta, p.comision AS presentacion_comision,
      p.opciones_venta, p.ml_botella,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar,
      (SELECT COALESCE(SUM(u.ml_restante), 0) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS ml_abierta,
      pr.id_producto AS producto_id, pr.codigo AS producto_codigo, pr.nombre AS producto_nombre,
      pr.foto AS producto_foto, pr.categoria_id, c.nombre AS categoria_nombre, pr.ml_shot,
      pr.ml_shot_anfitriona, pr.max_anfitrionas
     FROM inventario_presentaciones p
     INNER JOIN productos pr ON pr.id_producto = p.producto_id AND pr.estado = 1
     LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
     WHERE EXISTS (
       SELECT 1 FROM inventario_unidades u WHERE u.presentacion_id = p.id
         AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar'
     )
     ${whereCategoria} ${whereTerm}
     ORDER BY pr.nombre ASC, p.fecha_crea ASC, p.id ASC`,
    params
  );
  const topeSimple = await getTopeSimple();
  return rows.map(row => ({
    presentacion_id: row.presentacion_id,
    presentacion_nombre: row.presentacion_nombre,
    codigo_barras: row.codigo_barras ?? null,
    foto: row.presentacion_foto || row.producto_foto || 'default.png',
    precio_venta: Number(row.precio_venta ?? 0),
    comision: Number(row.presentacion_comision ?? 0),
    stock_bar: Number(row.stock_bar ?? 0),
    ml_botella:
      row.ml_botella === null || row.ml_botella === undefined ? null : Number(row.ml_botella),
    ml_shot: row.ml_shot === null || row.ml_shot === undefined ? null : Number(row.ml_shot),
    ml_shot_anfitriona:
      row.ml_shot_anfitriona === null || row.ml_shot_anfitriona === undefined
        ? null
        : Number(row.ml_shot_anfitriona),
    max_anfitrionas:
      row.max_anfitrionas === null || row.max_anfitrionas === undefined
        ? null
        : Number(row.max_anfitrionas),
    ml_abierta: Number(row.ml_abierta ?? 0),
    // Precio de shot guardado (si existe) para el selector Botella/Shot de la venta.
    opciones_venta:
      completarOpciones(
        row.opciones_venta,
        [
          {
            precio: Number(row.precio_venta ?? 0),
            comision: Number(row.presentacion_comision ?? 0)
          }
        ],
        topeSimple
      ) ?? undefined,
    producto_id: row.producto_id,
    producto_codigo: row.producto_codigo,
    producto_nombre: row.producto_nombre,
    categoria_id: row.categoria_id ?? null,
    categoria_nombre: row.categoria_nombre ?? null
  }));
}
