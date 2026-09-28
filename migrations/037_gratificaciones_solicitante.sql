-- 037) gratificaciones.solicitante_id ------------------------------------------
-- Las solicitudes del cajero se guardan a nombre del trabajador beneficiario
-- (usuario_id) y el id de quien la pedia se descartaba en el camino: no existia
-- forma de saber que una fila era "la que solicito Pepe". Sin ese dato el GET del
-- cajero tenia que abrir el listado completo de todos los trabajadores (decision
-- que duro hasta la 036) o no veria sus propias solicitudes.
--
-- La columna guarda el usuario que creo la fila. En las filas antiguas queda NULL:
-- no se puede reconstruir quien las solicito. ON DELETE SET NULL: si se borra el
-- usuario solicitante la gratificacion sigue siendo valida; solo se pierde la
-- atribucion.
ALTER TABLE gratificaciones
  ADD COLUMN IF NOT EXISTS solicitante_id varchar(36) DEFAULT NULL;

ALTER TABLE gratificaciones
  ADD CONSTRAINT fk_gratificaciones_solicitante
  FOREIGN KEY (solicitante_id) REFERENCES usuarios (id_usuario)
  ON DELETE SET NULL ON UPDATE CASCADE;
