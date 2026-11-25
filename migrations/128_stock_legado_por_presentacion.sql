-- 128) migrar stock agregado a una presentación explícita ------------------------
-- El stock antiguo de productos no identifica el formato físico. Se conserva en
-- una presentación marcada para revisión, sin asignarlo a un formato conocido.
-- La cantidad migrada es la diferencia frente a las unidades activas que ya hay
-- en bodega; así se pueden enlazar unidades sin presentación y repetir el SQL sin
-- duplicar stock.
INSERT INTO inventario_presentaciones (
  id,
  producto_id,
  nombre,
  precio_venta,
  comision,
  fecha_elaboracion,
  duracion_meses,
  fecha_vencimiento,
  fecha_crea
)
SELECT gen_random_uuid()::varchar,
       p.id_producto,
       'Stock legado (formato por confirmar)',
       COALESCE(p.precio, 0),
       COALESCE(p.comision, 0),
       p.fecha_elaboracion,
       p.duracion_meses,
       p.fecha_vencimiento,
       now()
  FROM productos p
 WHERE (
         p.stock_almacen > (
           SELECT COUNT(*)
             FROM inventario_unidades u
            WHERE u.producto_id = p.id_producto
              AND u.estado = 'almacen'
              AND u.ubicacion = 'almacen'
         )
         OR EXISTS (
           SELECT 1
             FROM inventario_unidades u
            WHERE u.producto_id = p.id_producto
              AND u.presentacion_id IS NULL
              AND u.estado = 'almacen'
              AND u.ubicacion = 'almacen'
         )
       )
   AND NOT EXISTS (
         SELECT 1
           FROM inventario_presentaciones ip
          WHERE ip.producto_id = p.id_producto
            AND ip.nombre = 'Stock legado (formato por confirmar)'
       );

-- Todo producto debe tener una presentación aunque todavía no tenga stock.
-- El nombre deja claro que el formato comercial real está pendiente de confirmar.
INSERT INTO inventario_presentaciones (
  id,
  producto_id,
  nombre,
  precio_venta,
  comision,
  fecha_elaboracion,
  duracion_meses,
  fecha_vencimiento,
  fecha_crea
)
SELECT gen_random_uuid()::varchar,
       p.id_producto,
       'Formato por confirmar',
       COALESCE(p.precio, 0),
       COALESCE(p.comision, 0),
       p.fecha_elaboracion,
       p.duracion_meses,
       p.fecha_vencimiento,
       now()
  FROM productos p
 WHERE NOT EXISTS (
         SELECT 1
           FROM inventario_presentaciones ip
          WHERE ip.producto_id = p.id_producto
       );

-- Vincula al formato pendiente las unidades activas de bodega que no tenían
-- presentación. Las unidades históricas/inactivas quedan sin alterar.
WITH presentaciones_legado AS (
  SELECT DISTINCT ON (producto_id) id, producto_id
    FROM inventario_presentaciones
   WHERE nombre = 'Stock legado (formato por confirmar)'
   ORDER BY producto_id, id
)
UPDATE inventario_unidades u
   SET presentacion_id = pl.id
  FROM presentaciones_legado pl
 WHERE u.producto_id = pl.producto_id
   AND u.presentacion_id IS NULL
   AND u.estado = 'almacen'
   AND u.ubicacion = 'almacen';

-- Alinea la secuencia con los códigos LM existentes antes de crear códigos nuevos.
DO $$
DECLARE
  max_codigo bigint;
  valor_secuencia bigint;
  secuencia_usada boolean;
BEGIN
  SELECT COALESCE(MAX((substring(codigo FROM '^LM-([0-9]+)$'))::bigint), 0)
    INTO max_codigo
    FROM inventario_unidades
   WHERE codigo ~ '^LM-[0-9]+$';

  SELECT last_value, is_called
    INTO valor_secuencia, secuencia_usada
    FROM inventario_sku_seq;

  IF max_codigo > valor_secuencia
     OR (max_codigo = valor_secuencia AND max_codigo > 0 AND NOT secuencia_usada) THEN
    PERFORM setval('inventario_sku_seq', max_codigo, true);
  END IF;
END $$;

-- Completa el stock agregado que todavía no está representado por unidades
-- activas de bodega. Cada unidad queda asociada al formato pendiente de revisión.
WITH stock_faltante AS (
  SELECT p.id_producto AS producto_id,
         GREATEST(
           p.stock_almacen - COUNT(u.id),
           0
         ) AS cantidad
    FROM productos p
    LEFT JOIN inventario_unidades u
      ON u.producto_id = p.id_producto
     AND u.estado = 'almacen'
     AND u.ubicacion = 'almacen'
   GROUP BY p.id_producto, p.stock_almacen
),
presentaciones_legado AS (
  SELECT DISTINCT ON (producto_id) id, producto_id
    FROM inventario_presentaciones
   WHERE nombre = 'Stock legado (formato por confirmar)'
   ORDER BY producto_id, id
),
nuevas_unidades AS MATERIALIZED (
  SELECT sf.producto_id,
         pl.id AS presentacion_id,
         nextval('inventario_sku_seq') AS codigo
    FROM stock_faltante sf
    JOIN presentaciones_legado pl ON pl.producto_id = sf.producto_id
    CROSS JOIN LATERAL generate_series(1, sf.cantidad) AS serie(unidad)
   WHERE sf.cantidad > 0
)
INSERT INTO inventario_unidades (
  id,
  producto_id,
  presentacion_id,
  codigo,
  ubicacion,
  estado,
  fecha_crea
)
SELECT gen_random_uuid()::varchar,
       nu.producto_id,
       nu.presentacion_id,
       'LM-' || lpad(nu.codigo::text, GREATEST(6, length(nu.codigo::text)), '0'),
       'almacen',
       'almacen',
       now()
  FROM nuevas_unidades nu;

-- productos.stock_almacen sigue siendo la caché del stock activo en bodega.
UPDATE productos p
   SET stock_almacen = (
         SELECT COUNT(*)::integer
           FROM inventario_unidades u
          WHERE u.producto_id = p.id_producto
            AND u.estado = 'almacen'
            AND u.ubicacion = 'almacen'
       )
 WHERE p.stock_almacen IS DISTINCT FROM (
         SELECT COUNT(*)::integer
           FROM inventario_unidades u
          WHERE u.producto_id = p.id_producto
            AND u.estado = 'almacen'
            AND u.ubicacion = 'almacen'
       );