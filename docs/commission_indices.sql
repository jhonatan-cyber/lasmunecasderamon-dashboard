-- Índices para la tabla comisiones
ALTER TABLE comisiones
  ADD INDEX idx_estado (estado),
  ADD INDEX idx_fecha_estado (fecha_crea, estado),
  ADD INDEX idx_monto (monto),
  ADD INDEX idx_fecha_estado_monto (fecha_crea, estado, monto),
  ADD INDEX idx_venta_servicio (venta_id, servicio_id);

-- Índices para la tabla detalle_comisiones
ALTER TABLE detalle_comisiones
  ADD INDEX idx_usuario_comision (usuario_id, comision_id),
  ADD INDEX idx_estado_fecha (estado, fecha_pago);

-- Índices para la tabla usuarios (relacionados con comisiones)
ALTER TABLE usuarios
  ADD INDEX idx_estado_nombre (estado, nombre, apellido);

-- Índices para ventas y servicios (para los JOIN)
ALTER TABLE ventas
  ADD INDEX idx_fecha_total (fecha, total);

ALTER TABLE servicios
  ADD INDEX idx_fecha_total (fecha, total);

-- Estadísticas de las tablas para el optimizador
ANALYZE TABLE comisiones, detalle_comisiones, usuarios, ventas, servicios;
