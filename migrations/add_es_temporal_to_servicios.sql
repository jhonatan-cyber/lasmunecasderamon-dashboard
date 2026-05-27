ALTER TABLE servicios
  ADD COLUMN es_temporal tinyint(1) NOT NULL DEFAULT 0 AFTER estado,
  ADD COLUMN servicio_original_id varchar(36) DEFAULT NULL AFTER es_temporal;
