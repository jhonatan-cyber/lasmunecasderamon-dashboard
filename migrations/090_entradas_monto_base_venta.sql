-- Las entradas con adicional se cobran como una venta normal cuyo total integra
-- el monto base de la entrada(productos deben sumar entrada + adicional), pero
-- antes se guardaban con monto_entrada = 0 y la UI solo mostraba el adicional.
-- Se restaura el monto base en cada fila del grupo usando la venta ligada
-- (ventas.entrada_id): base = total de la venta - adicionales, repartida por
-- igual entre las entradas del grupo (el resto va a la primera).

WITH grupos_con_venta AS (
  SELECT DISTINCT ON (COALESCE(e.grupo_registro_id, e.id))
         COALESCE(e.grupo_registro_id, e.id) AS grupo_id,
         v.total AS venta_total
    FROM ventas v
    JOIN entradas_clientes e ON e.id = v.entrada_id
   WHERE v.entrada_id IS NOT NULL
   ORDER BY COALESCE(e.grupo_registro_id, e.id), v.fecha_crea DESC
),
resumen AS (
  SELECT g.grupo_id,
         g.venta_total,
         COALESCE(SUM(r.monto_bebida_adicional), 0) AS adicional_total,
         COUNT(r.id)::int AS filas
    FROM grupos_con_venta g
    JOIN entradas_clientes r
      ON COALESCE(r.grupo_registro_id, r.id) = g.grupo_id
   GROUP BY g.grupo_id, g.venta_total
  HAVING COALESCE(SUM(r.monto_bebida_adicional), 0) > 0
),
reparto AS (
  SELECT grupo_id,
         filas,
         GREATEST(venta_total - adicional_total, 0)::int
           / filas AS por_fila,
         GREATEST(venta_total - adicional_total, 0)::int
           % filas AS resto
    FROM resumen
),
asignadas AS (
  SELECT e2.id,
         p.por_fila
         + CASE
             WHEN ROW_NUMBER() OVER (PARTITION BY p.grupo_id ORDER BY e2.id) <= p.resto
             THEN 1 ELSE 0
           END AS asignado
    FROM entradas_clientes e2
    JOIN reparto p ON p.grupo_id = COALESCE(e2.grupo_registro_id, e2.id)
   WHERE e2.monto_entrada = 0
)
UPDATE entradas_clientes e
   SET monto_entrada = a.asignado
  FROM asignadas a
 WHERE e.id = a.id;
