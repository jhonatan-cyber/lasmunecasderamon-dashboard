-- ============================================================
-- Migración: Índices de rendimiento para queries del dashboard
-- ============================================================
-- Fecha: 2026-05-27
-- Problema: GET /api/dashboard/composite tomaba 19+ segundos y
--           lanzaba ECONNRESET por timeout en MySQL.
-- Causa: Faltaban índices compuestos en (estado, fecha_crea)
--         en ventas y servicios, e índices FK en tablas detalle.
-- ============================================================

-- Índice compuesto para ventas: filtrar por estado + rango de fecha
ALTER TABLE ventas
  ADD INDEX idx_ventas_estado_fecha (estado, fecha_crea);

-- Índice compuesto para servicios: filtrar por estado + rango de fecha
ALTER TABLE servicios
  ADD INDEX idx_servicios_estado_fecha (estado, fecha_crea);

-- Índice FK para detalle_ventas.venta_id (usado en JOIN con ventas)
ALTER TABLE detalle_ventas
  ADD INDEX idx_detalle_ventas_venta_id (venta_id);

-- Índice FK para detalle_ventas.producto_id (usado en JOIN con productos + GROUP BY)
ALTER TABLE detalle_ventas
  ADD INDEX idx_detalle_ventas_producto_id (producto_id);

-- Índice FK para detalle_servicios.servicio_id (usado en JOIN con servicios)
ALTER TABLE detalle_servicios
  ADD INDEX idx_detalle_servicios_servicio_id (servicio_id);

-- Índice FK para detalle_servicios.usuario_id (usado en JOIN con usuarios + GROUP BY)
ALTER TABLE detalle_servicios
  ADD INDEX idx_detalle_servicios_usuario_id (usuario_id);
