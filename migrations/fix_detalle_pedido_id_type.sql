-- ============================================================
-- Migración: Corregir tipo de columna detalle_pedido_id
-- ============================================================
-- Fecha: 2026-05-27
-- Problema: POST /api/orders fallaba con:
--   "Incorrect integer value: '<uuid>' for column 'detalle_pedido_id'"
-- Causa: La columna `detalle_pedido_id` en `detalle_pedidos_anfitrionas`
--         era de tipo INT, pero el código envía UUIDs (varchar(36)),
--         consistente con el resto del sistema (todas las IDs son UUIDs).
-- ============================================================

ALTER TABLE detalle_pedidos_anfitrionas
  MODIFY COLUMN detalle_pedido_id varchar(36) NOT NULL;
