ALTER TABLE entradas_clientes
  ADD COLUMN IF NOT EXISTS grupo_registro_id varchar(36);

CREATE INDEX IF NOT EXISTS idx_entradas_clientes_grupo_registro
  ON entradas_clientes(grupo_registro_id);

WITH grupos_anteriores AS (
  SELECT fecha, hora, fecha_crea, caja_id, registrado_por, metodo_pago,
         md5(fecha::text || '|' || hora::text || '|' || fecha_crea::text || '|' ||
             caja_id || '|' || registrado_por || '|' || metodo_pago) AS grupo_registro_id
    FROM entradas_clientes
   WHERE grupo_registro_id IS NULL
   GROUP BY fecha, hora, fecha_crea, caja_id, registrado_por, metodo_pago
  HAVING count(*) > 1
)
UPDATE entradas_clientes e
   SET grupo_registro_id = g.grupo_registro_id
  FROM grupos_anteriores g
 WHERE e.grupo_registro_id IS NULL
   AND e.fecha = g.fecha
   AND e.hora = g.hora
   AND e.fecha_crea = g.fecha_crea
   AND e.caja_id = g.caja_id
   AND e.registrado_por = g.registrado_por
   AND e.metodo_pago = g.metodo_pago;
