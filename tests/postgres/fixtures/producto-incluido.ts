import { query } from '@/lib/database/db';
import { ESTADO_UNIDAD_ACTIVA } from '@/modules/inventario/estados';

/** Producto disponible para los privados con comisión de habitación. */
export async function crearProductoIncluido(): Promise<string> {
  const producto = crypto.randomUUID();
  const presentacion = crypto.randomUUID();
  const unidad = crypto.randomUUID();
  await query(
    `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
     VALUES (?, ?, 'Producto incluido de prueba', 10000, 0, 'Fixture de privados', now())`,
    [producto, producto.slice(0, 10)]
  );
  await query(
    `INSERT INTO inventario_presentaciones (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea)
     VALUES (?, ?, '750 ml', 10000, 0, 750, now())`,
    [presentacion, producto]
  );
  await query(
    `INSERT INTO inventario_unidades (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea)
     VALUES (?, ?, ?, ?, 'bar', ?, now())`,
    [unidad, producto, presentacion, unidad.slice(0, 10), ESTADO_UNIDAD_ACTIVA]
  );
  return presentacion;
}
