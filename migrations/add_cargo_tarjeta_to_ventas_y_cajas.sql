-- ============================================================
-- Migración: Bucket contable propio del cargo por tarjeta
-- ============================================================
-- Fecha: 2026-08-09
-- Problema: el cargo por tarjeta (impuesto_propina) se sumaba al total de la
--           venta, inflando la métrica de ventas.
-- Solución: columnas `cargo_tarjeta` en `ventas` y `cajas` (DEFAULT 0) para
--           llevar el cargo a su bucket contable propio, separado de la
--           métrica de venta y del reparto de propinas.
-- Idempotente: el runner (run-migrations.mjs) ignora "duplicate column name"
--              si la migración ya se aplicó.
-- ============================================================

ALTER TABLE ventas
  ADD COLUMN cargo_tarjeta int NOT NULL DEFAULT 0 AFTER propina;

ALTER TABLE cajas
  ADD COLUMN cargo_tarjeta int NOT NULL DEFAULT 0 AFTER venta;
