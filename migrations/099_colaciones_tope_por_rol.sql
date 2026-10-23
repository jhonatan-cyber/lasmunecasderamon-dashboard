-- 099) Colaciones por tope de rol en el turno ---------------------------------
-- La regla era una colación por trabajador y turno, garantizada en base por el
-- índice único (usuario_id, caja_id) de la migración 095. Ahora el tope se
-- configura por rol (`configuraciones.clave colaciones_por_rol_y_turno`,
-- `{"<rol_id>": n}`; rol sin entrada = regla vigente de 1; 0 = el rol no
-- recibe colación). El índice único bloquearía la segunda colación de un rol
-- con tope 2, así que se degrada a un índice normal: la unicidad la garantiza
-- el `SELECT ... FOR UPDATE` del trabajador más el conteo dentro del mismo
-- bloqueo de la caja, igual que la venía garantizando el código.
DROP INDEX IF EXISTS idx_colaciones_usuario_caja;

CREATE INDEX IF NOT EXISTS idx_colaciones_usuario_caja
  ON colaciones(usuario_id, caja_id);
