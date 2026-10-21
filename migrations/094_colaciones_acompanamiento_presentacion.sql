-- 094) Acompañamiento elegible en la colación ------------------------------
-- Cuando la bebida de la anfitriona incluye acompañamiento, se guarda qué
-- bebida analcohólica concreta se entregó (sabor/producto), no solo el tipo
-- histórico gaseosa/soda. La columna heredada `acompanamiento` se conserva para
-- los registros anteriores y para clientes antiguos.
ALTER TABLE colaciones
  ADD COLUMN IF NOT EXISTS acompanamiento_presentacion_id varchar(36)
    REFERENCES inventario_presentaciones(id);

CREATE INDEX IF NOT EXISTS idx_colaciones_acompanamiento
  ON colaciones(acompanamiento_presentacion_id);
