-- 057) la capacidad de la botella sale del nombre de la presentación ----------------
-- Las presentaciones se nombran por su formato ("1000 ml", "750 ml", "1 litro") pero
-- `inventario_presentaciones.ml_botella` (030) quedó en NULL en todas: nadie la guardó.
-- Con la columna vacía, `consume()` abría la botella con la capacidad de Configuraciones
-- (`botella_ml`, 750 ml por defecto), así que el primer shot de 50 ml sobre una
-- presentación de 1000 ml dejaba `ml_restante = 700` y el bar mostraba 700 ml de algo que
-- nunca se sirvió. El movimiento de venta sí anotaba los 50 ml reales: de ahí que
-- "Shots servidos: 50 ml" no cuadrara con "Abierta: 700 ml".
--
-- El código ya no depende del nombre (037 y el fallback de Configuraciones siguen igual),
-- pero los datos que quedaron mal sí se pueden corregir: el nombre de la presentación
-- declara su capacidad y el saldo de la botella abierta es exacto mientras la
-- presentación tenga una sola botella abierta.
WITH declaracion AS (
  SELECT id,
         ROUND(
           REPLACE(m[1], ',', '.')::numeric * CASE WHEN m[2] ~* '^l' THEN 1000 ELSE 1 END
         )::integer AS ml
    FROM (
      SELECT id, regexp_match(nombre, '([0-9]+(?:[.,][0-9]+)?)[[:space:]]*(ml|mililitros?|litros?|l)\y') AS m
        FROM inventario_presentaciones
       WHERE ml_botella IS NULL
         AND nombre ~* '[0-9]+[[:space:]]*(ml|mililitros?|litros?|l)'
    ) declarados
   WHERE m[1] IS NOT NULL
)
UPDATE inventario_presentaciones p
   SET ml_botella = d.ml
  FROM declaracion d
 WHERE p.id = d.id
   AND d.ml > 0;

-- Regresa el contenido que se perdió al abrir esas botellas con una capacidad menor que
-- la real: la diferencia entre la capacidad verdadera y la que se usó al abrir. Sólo se
-- toca lo que se puede demostrar —una botella abierta en el bar cuya capacidad más lo
-- servido da exactamente la capacidad asumida— y nunca por encima de la capacidad real.
-- Si una presentación tiene varias botellas abiertas, el saldo no se puede repartir con
-- certeza y se deja como está: el siguiente shot ya usa la capacidad correcta.
WITH asumida AS (
  -- La capacidad con la que se abrieron: la de Configuraciones si guardaron `botella_ml`,
  -- y el default documentado de 750 ml cuando no.
  SELECT COALESCE(
           NULLIF(
             (SELECT valor FROM configuraciones WHERE clave = 'botella_ml' AND valor ~ '^[0-9]+$')::integer,
             0
           ),
           750
         ) AS ml
),
servido AS (
  SELECT presentacion_id, SUM(ml) AS ml_servidos
    FROM inventario_movimientos
   WHERE tipo = 'venta' AND ml > 0
   GROUP BY presentacion_id
),
a_reponer AS (
  SELECT u.id,
         LEAST(u.ml_restante + (p.ml_botella - a.ml), p.ml_botella) AS ml_restante
    FROM inventario_unidades u
    INNER JOIN inventario_presentaciones p ON p.id = u.presentacion_id
    CROSS JOIN asumida a
    LEFT JOIN servido s ON s.presentacion_id = p.id
   WHERE u.estado = 'almacen'
     AND u.ubicacion = 'bar'
     AND u.ml_restante > 0
     AND p.ml_botella > a.ml
     AND u.ml_restante + COALESCE(s.ml_servidos, 0) = a.ml
)
UPDATE inventario_unidades u
   SET ml_restante = r.ml_restante
  FROM a_reponer r
 WHERE u.id = r.id;

-- Una botella con contenido restante siempre fue abierta por shots: es el único camino
-- que descuenta ml (042). Las que ya estaban abiertas quedaron en false por el default de
-- esa migración y su envase no se reconocería como uno que vuelve al almacén.
UPDATE inventario_unidades
   SET abierta_por_shots = true
 WHERE ml_restante > 0
   AND NOT abierta_por_shots;