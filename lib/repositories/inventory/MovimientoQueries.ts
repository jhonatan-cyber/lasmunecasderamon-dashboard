/**
 * Historial de entradas y salidas de inventario. Sólo lectura: los movimientos se escriben
 * desde los módulos que originan la operación (bar, transferencias, devoluciones).
 */
import { query } from '@/lib/database/db';
import { completarOpciones } from './inventoryHelpers';
import { getTopeSimple } from './inventoryConfig';

export class MovimientoQueries {
  static async listMovimientos(presentacionId: string, limit = 20): Promise<any[]> {
    return await query<any[]>(
      `SELECT * FROM inventario_movimientos WHERE presentacion_id = ? ORDER BY fecha_crea DESC LIMIT ?`,
      [presentacionId, limit]
    );
  }

  static async listMovimientosRecientes(limit = 100): Promise<any[]> {
    try {
      const rows = await query<any[]>(
        `SELECT m.*, pr.nombre AS producto_nombre, p.nombre AS presentacion_nombre,
          u.nick AS usuario_nombre,
          r.nick AS aceptado_nombre,
          c.nombre AS categoria_nombre,
          p.precio_venta AS pres_precio, p.comision AS pres_comision,
          pr.precio AS producto_precio, pr.comision AS producto_comision, pr.ml_shot,
          pr.ml_shot_anfitriona
         FROM inventario_movimientos m
         LEFT JOIN productos pr ON pr.id_producto = m.producto_id
         LEFT JOIN inventario_presentaciones p ON p.id = m.presentacion_id
         LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
         LEFT JOIN usuarios u ON u.id_usuario = m.usuario_id
         LEFT JOIN usuarios r ON r.id_usuario = m.aceptado_por
         ORDER BY m.fecha_crea DESC LIMIT ?`,
        [limit]
      );
      const topeSimple = await getTopeSimple();
      return rows.map(row => ({
        ...row,
        opciones_venta:
          completarOpciones(
            row.opciones_venta,
            [
              { precio: Number(row.precio_venta ?? 0), comision: Number(row.comision ?? 0) },
              { precio: Number(row.pres_precio ?? 0), comision: Number(row.pres_comision ?? 0) },
              {
                precio: Number(row.producto_precio ?? 0),
                comision: Number(row.producto_comision ?? 0)
              }
            ],
            topeSimple
          ) ?? row.opciones_venta
      }));
    } catch {
      return [];
    }
  }
}
