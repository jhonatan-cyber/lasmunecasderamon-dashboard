import { query } from '@/lib/database/db';
import { CATEGORIA_BEBIDAS_ANALCOHOLICAS } from '@/lib/business/colacionRoles';
import { hoyDelNegocio } from '@/lib/business/vencimiento';
import { getTopeSimple } from '../bar/configuracion';
import { completarOpciones } from '../helpers';
import { ESTADO_UNIDAD_ACTIVA } from '../estados';

export interface FiltrosParaVenta {
  category_id?: string;
  term?: string;
  solo_colaciones?: boolean;
  solo_cover?: boolean;
  solo_colaciones_analcoholicas?: boolean;
}

export async function listarParaVenta(filters?: FiltrosParaVenta): Promise<any[]> {
  const params: any[] = [];
  const hoy = hoyDelNegocio();
  params.push(hoy, hoy, hoy);
  const whereColacion = filters?.solo_colaciones
    ? `AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.opciones_venta::jsonb, '[]'::jsonb)) opcion
        WHERE opcion->>'tipo' = 'botella' AND opcion->>'colacion_habilitada' = 'true'
      )`
    : '';
  const whereCover = filters?.solo_cover
    ? `AND c.system_key = 'bebidas_analcoholicas' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.opciones_venta::jsonb, '[]'::jsonb)) opcion
        WHERE opcion->>'tipo' = 'botella' AND opcion->>'cover_habilitado' = 'true'
      )`
    : '';

  const whereColacionAnalcoholica = filters?.solo_colaciones_analcoholicas
    ? `AND c.system_key = ? AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.opciones_venta::jsonb, '[]'::jsonb)) opcion
        WHERE opcion->>'tipo' = 'botella' AND opcion->>'colacion_habilitada' = 'true'
      )`
    : '';

  const filtrandoEspecial = Boolean(
    filters?.solo_colaciones || filters?.solo_cover || filters?.solo_colaciones_analcoholicas
  );
  const whereEnVenta = filtrandoEspecial
    ? ''
    : `AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.opciones_venta::jsonb, '[]'::jsonb)) opcion
        WHERE opcion->>'tipo' = 'botella' AND opcion->>'en_venta' = 'false'
      )`;
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
      'AND (LOWER(pr.nombre) LIKE LOWER(?) OR LOWER(pr.codigo) LIKE LOWER(?) OR LOWER(p.nombre) LIKE LOWER(?) OR LOWER(p.codigo_barras) LIKE LOWER(?) OR LOWER(c.nombre) LIKE LOWER(?))';
    params.push(like, like, like, like, like);
  }
  if (filters?.solo_colaciones_analcoholicas) params.push(CATEGORIA_BEBIDAS_ANALCOHOLICAS);
  const rows = await query<any[]>(
    `SELECT p.id AS presentacion_id, p.nombre AS presentacion_nombre,
      p.codigo_barras, p.foto AS presentacion_foto,
      p.precio_venta, p.comision AS presentacion_comision,
      p.opciones_venta, p.ml_botella,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar' AND (COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NULL OR COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= ?)) AS stock_bar,
      (SELECT COALESCE(SUM(u.ml_restante), 0) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar' AND (COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NULL OR COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= ?)) AS ml_abierta,
      pr.id_producto AS producto_id, pr.codigo AS producto_codigo, pr.nombre AS producto_nombre,
      pr.foto AS producto_foto, pr.categoria_id, c.nombre AS categoria_nombre, pr.ml_shot,
      pr.ml_shot_anfitriona, pr.max_anfitrionas
     FROM inventario_presentaciones p
     INNER JOIN productos pr ON pr.id_producto = p.producto_id AND pr.estado = 1
     LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
     WHERE EXISTS (
       SELECT 1 FROM inventario_unidades u WHERE u.presentacion_id = p.id
         AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar'
         AND (COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NULL
              OR COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= ?)
     )
      ${whereCategoria} ${whereTerm} ${whereColacion} ${whereCover} ${whereColacionAnalcoholica} ${whereEnVenta}
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
