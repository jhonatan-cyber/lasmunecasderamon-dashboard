-- ============================================================
-- Migración: Índices compuestos adicionales para queries del dashboard
-- ============================================================
-- Fecha: 2026-07-16
-- Problema: Dashboard composite/insights tomaban 800ms-2.5s.
-- Causa raíz: Faltaban índices compuestos en tablas FK principales
--             y el `createSale` hacía N+1 queries sin índices de apoyo.
-- ============================================================
-- NOTA: Ejecutar con: mysql -u root -p lasmunecasderamon < add_composite_indexes.sql
-- ============================================================

-- ============================================================
-- PRIORIDAD ALTA: Índices para queries del dashboard composite/insights
-- ============================================================

CALL create_index_if_not_exists('ventas_usuarios', 'idx_ventas_usuarios_venta_id', '(venta_id)');
CALL create_index_if_not_exists('ventas_usuarios', 'idx_ventas_usuarios_usuario_id', '(usuario_id)');
CALL create_index_if_not_exists('retiros_caja', 'idx_retiros_caja_caja_id', '(caja_id)');
CALL create_index_if_not_exists('cajas', 'idx_cajas_estado', '(estado)');
CALL create_index_if_not_exists('pedidos', 'idx_pedidos_estado', '(estado)');
CALL create_index_if_not_exists('pedidos', 'idx_pedidos_mesero_id', '(mesero_id)');
CALL create_index_if_not_exists('pedidos_usuarios', 'idx_pedidos_usuarios_usuario_id', '(usuario_id)');
CALL create_index_if_not_exists('pedidos_usuarios', 'idx_pedidos_usuarios_pedido_id', '(pedido_id)');
CALL create_index_if_not_exists('comisiones', 'idx_comisiones_venta_id', '(venta_id)');
CALL create_index_if_not_exists('comisiones', 'idx_comisiones_servicio_id', '(servicio_id)');
CALL create_index_if_not_exists('ventas', 'idx_ventas_caja_estado_fecha', '(caja_id, estado, fecha_crea)');
CALL create_index_if_not_exists('servicios', 'idx_servicios_caja_estado_fecha', '(caja_id, estado, fecha_crea)');
CALL create_index_if_not_exists('solicitudes_servicios', 'idx_solicitudes_servicios_estado', '(estado)');

-- ============================================================
-- PRIORIDAD MEDIA: Índices para queries de resumen de usuario
-- ============================================================

CALL create_index_if_not_exists('asistencias', 'idx_asistencias_usuario_estado', '(usuario_id, estado)');
CALL create_index_if_not_exists('anticipos', 'idx_anticipos_usuario_estado', '(usuario_id, estado)');
CALL create_index_if_not_exists('detalle_propinas', 'idx_detalle_propinas_usuario_id', '(usuario_id)');
CALL create_index_if_not_exists('horas_extras', 'idx_horas_extras_usuario_id', '(usuario_id)');
CALL create_index_if_not_exists('detalle_comisiones', 'idx_detalle_comisiones_usuario_id', '(usuario_id)');

-- ============================================================
-- PRIORIDAD BAJA: Índices para queries de autenticación
-- ============================================================

CALL create_index_if_not_exists('logins', 'idx_logins_usuario_id', '(usuario_id)');
CALL create_index_if_not_exists('propinas', 'idx_propinas_venta_id', '(venta_id)');
CALL create_index_if_not_exists('detalle_ventas', 'idx_detalle_ventas_hostess_id', '(hostess_id)');

-- ============================================================
-- NOTA: Si el procedimiento almacenado `create_index_if_not_exists`
-- no existe, ejecutar primero la siguiente definición desde el dump:
-- ============================================================
