import type { TransactionQuery } from '@/lib/database/db';

export interface PresentacionVentaBloqueada {
  activa: boolean;
  id: string;
  producto_id: string;
  nombre: string;
  precio_venta: number;
  comision: number;
  ml_botella: number | null;
  opciones_venta: unknown;
  estado: number | null;
  fecha_vencimiento: string | null;
}

export interface StockAcompanamiento {
  presentacion_id: string;
  stock_bar: number;
  ml_abierta: number;
}

export interface ProductoPrecio {
  id_producto: string;
  precio: number;
  comision: number;
  max_anfitrionas: number | null;
  estado: number;
  tiene_presentaciones: boolean;
  categoria: string | null;
}

export interface TramoPrecio {
  producto_id: string;
  anfitrionas: number;
  precio: number;
  comision: number;
}

export async function obtenerStockBarParaAcompanamiento(
  trx: TransactionQuery,
  presentacionIds: string[]
): Promise<Map<string, StockAcompanamiento>> {
  if (presentacionIds.length === 0) return new Map();
  const rows = await trx<StockAcompanamiento[]>(
    `SELECT IU.presentacion_id,
            COUNT(*) FILTER (WHERE IU.estado = 'almacen' AND (COALESCE(IU.ml_restante, 0) > 0 OR IU.abierta_por_shots IS NOT TRUE)) AS stock_bar,
            COALESCE(SUM(CASE WHEN IU.estado = 'almacen' AND COALESCE(IU.ml_restante, 0) > 0 THEN IU.ml_restante WHEN IU.estado = 'almacen' AND IU.ml_restante IS NULL THEN IP.ml_botella ELSE 0 END), 0) AS ml_abierta
       FROM inventario_unidades IU
       JOIN inventario_presentaciones IP ON IP.id = IU.presentacion_id
      WHERE IU.presentacion_id IN (${presentacionIds.map(() => '?').join(',')})
        AND IU.ubicacion = 'bar'
      GROUP BY IU.presentacion_id`,
    presentacionIds
  );
  return new Map(rows.map(row => [row.presentacion_id, row]));
}

export function bloquearPresentacionesVenta(
  trx: TransactionQuery,
  presentacionIds: string[]
): Promise<PresentacionVentaBloqueada[]> {
  return trx(
    `SELECT id, activa, opciones_venta, producto_id, nombre, precio_venta, comision, ml_botella,
            fecha_vencimiento,
            (SELECT pr.estado FROM productos pr WHERE pr.id_producto = inventario_presentaciones.producto_id) AS estado
       FROM inventario_presentaciones
      WHERE id IN (${presentacionIds.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`,
    presentacionIds
  );
}

export function listarProductosPreciosVenta(
  trx: TransactionQuery,
  productoIds: string[]
): Promise<ProductoPrecio[]> {
  return trx(
    `SELECT P.id_producto, P.precio, P.comision, P.max_anfitrionas, P.estado,
            EXISTS (SELECT 1 FROM inventario_presentaciones IP WHERE IP.producto_id = P.id_producto) AS tiene_presentaciones,
            C.nombre AS categoria
       FROM productos P LEFT JOIN categorias C ON C.id_categoria = P.categoria_id
      WHERE P.id_producto IN (${productoIds.map(() => '?').join(',')})`,
    productoIds
  );
}

export function listarTramosPrecioVenta(
  trx: TransactionQuery,
  productoIds: string[]
): Promise<TramoPrecio[]> {
  return trx(
    `SELECT producto_id, anfitrionas, precio, comision FROM producto_champagne_tiers
      WHERE producto_id IN (${productoIds.map(() => '?').join(',')})`,
    productoIds
  );
}
