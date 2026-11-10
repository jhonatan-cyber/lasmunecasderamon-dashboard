-- 117) Distinguir las anulaciones manuales del barrido del cierre -------------
-- Una entrada pendiente puede cerrarse de dos formas, y ambas usaban el mismo
-- estado 'anulada':
--   * manual: el cliente se fue antes de la barra y se le devuelve el dinero
--     (no se postea nada en la caja);
--   * barrido del cierre: el turno terminó con la entrada pendiente y la caja
--     registra ese dinero como ingreso del turno.
-- El total de entradas necesita separarlas: lo devuelto no es dinero cobrado.
--
-- `anulacion_origen` guarda el origen. Las filas históricas quedan en 'cierre'
-- porque el comportamiento anterior posteaba el dinero en ambos casos.
ALTER TABLE entradas_clientes
  ADD COLUMN IF NOT EXISTS anulacion_origen varchar(20);

ALTER TABLE entradas_clientes
  DROP CONSTRAINT IF EXISTS entradas_clientes_anulacion_origen_check,
  ADD CONSTRAINT entradas_clientes_anulacion_origen_check
    CHECK (anulacion_origen IS NULL OR anulacion_origen IN ('manual', 'cierre'));

UPDATE entradas_clientes
   SET anulacion_origen = 'cierre'
 WHERE cortesia_estado = 'anulada' AND anulacion_origen IS NULL;
