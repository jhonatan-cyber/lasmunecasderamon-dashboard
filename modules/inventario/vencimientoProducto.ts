/**
 * Vencimiento derivado del producto.
 *
 * Con las fechas de lote por presentación, `productos.fecha_vencimiento` ya no
 * se edita: se calcula como el vencimiento más temprano entre las presentaciones
 * del producto, que es el que importa para avisar. Si ninguna presentación tiene
 * fecha, conserva el valor que ya tenía (productos anteriores a la migración 110
 * que todavía no heredaron sus fechas).
 *
 * Desde la migración 111 el vencimiento vive además en cada unidad, así que el
 * derivado mira primero el stock que hay: el vencimiento más temprano entre las
 * botellas con stock. Así comprar un lote nuevo no "renueva" el aviso del
 * producto mientras todavía queda stock viejo, y dar de baja el lote vencido
 * hace que el producto avise por el lote siguiente.
 *
 * Vive aparte de los repositorios porque lo escriben los dos: el de productos
 * (alta y edición con presentaciones) y el de presentaciones (alta, edición de
 * fechas y borrado).
 */
import type { TransactionQuery } from '@/lib/database/db';
import { ESTADO_UNIDAD_ACTIVA } from './estados';

type Ejecutor = TransactionQuery;

export async function sincronizarVencimientoProducto(
  ejecutor: Ejecutor,
  productoId: string
): Promise<void> {
  await ejecutor(
    `UPDATE productos
        SET fecha_vencimiento = COALESCE(
              (SELECT MIN(COALESCE(u.fecha_vencimiento, p.fecha_vencimiento))
                 FROM inventario_unidades u
                 JOIN inventario_presentaciones p ON p.id = u.presentacion_id
                WHERE p.producto_id = productos.id_producto
                  AND u.estado = '${ESTADO_UNIDAD_ACTIVA}'),
              (SELECT MIN(p.fecha_vencimiento)
                 FROM inventario_presentaciones p
                WHERE p.producto_id = productos.id_producto),
              fecha_vencimiento)
      WHERE id_producto = ?`,
    [productoId]
  );
}
