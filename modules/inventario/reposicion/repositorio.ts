import type { TransactionQuery } from '@/lib/database/db';

export interface PresentacionReposicionRow {
  id: string;
  stock_minimo: number;
  stock_maximo: number;
  precio_compra: number | string | null;
  producto_id: string;
  producto: string;
  presentacion: string;
  stock_bodega: number | string;
  stock_bar: number | string;
  unidades_vencidas: number | string;
}

export interface OrdenReposicionPendienteRow {
  id: string;
  presentacion_id: string;
}

export async function bloquearSincronizacionReposicion(trx: TransactionQuery): Promise<void> {
  await trx('SELECT pg_advisory_xact_lock(7942079)');
}

export async function listarPresentacionesParaReposicion(
  trx: TransactionQuery,
  hoy: string
): Promise<PresentacionReposicionRow[]> {
  const vigente = `COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NULL
             OR COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= ?`;
  return trx(
    `SELECT p.id, p.stock_minimo, p.stock_maximo,
      p.precio_compra, p.producto_id, pr.nombre AS producto, p.nombre AS presentacion,
      COUNT(u.id) FILTER (WHERE u.ubicacion = 'almacen' AND ${vigente})::int AS stock_bodega,
      COUNT(u.id) FILTER (WHERE u.ubicacion = 'bar' AND ${vigente})::int AS stock_bar,
      COUNT(u.id) FILTER (WHERE COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NOT NULL
             AND COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) < ?)::int AS unidades_vencidas
      FROM inventario_presentaciones p JOIN productos pr ON pr.id_producto = p.producto_id
      LEFT JOIN inventario_unidades u ON u.presentacion_id = p.id AND u.estado = 'almacen' AND u.ubicacion IN ('almacen', 'bar')
      WHERE pr.estado = 1 AND p.stock_minimo IS NOT NULL
      GROUP BY p.id, pr.nombre ORDER BY p.id`,
    [hoy, hoy, hoy]
  );
}

export async function listarOrdenesReposicionPendientes(
  trx: TransactionQuery
): Promise<OrdenReposicionPendienteRow[]> {
  return trx("SELECT id, presentacion_id FROM ordenes_reposicion WHERE estado = 'pendiente'");
}

export async function resolverOrdenReposicion(
  trx: TransactionQuery,
  ordenId: string
): Promise<void> {
  await trx(
    "UPDATE ordenes_reposicion SET estado = 'resuelta', fecha_mod = CURRENT_TIMESTAMP WHERE id = ?",
    [ordenId]
  );
}

export async function actualizarOrdenReposicion(
  trx: TransactionQuery,
  data: {
    id: string;
    cantidad: number;
    stock: number;
    stockMaximo: number;
  }
): Promise<void> {
  await trx(
    `UPDATE ordenes_reposicion SET cantidad = ?, stock_actual = ?, stock_maximo = ?, fecha_mod = CURRENT_TIMESTAMP
      WHERE id = ? AND (cantidad <> ? OR stock_actual <> ? OR stock_maximo <> ?)`,
    [
      data.cantidad,
      data.stock,
      data.stockMaximo,
      data.id,
      data.cantidad,
      data.stock,
      data.stockMaximo
    ]
  );
}

export async function crearOrdenReposicion(
  trx: TransactionQuery,
  data: {
    id: string;
    presentacionId: string;
    cantidad: number;
    stock: number;
    stockMaximo: number;
  }
): Promise<void> {
  await trx(
    'INSERT INTO ordenes_reposicion(id, presentacion_id, cantidad, stock_actual, stock_maximo) VALUES (?, ?, ?, ?, ?)',
    [data.id, data.presentacionId, data.cantidad, data.stock, data.stockMaximo]
  );
}
