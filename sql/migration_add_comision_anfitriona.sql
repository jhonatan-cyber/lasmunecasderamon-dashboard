-- Migración: Agregar columna de comisión para anfitrionas en habitaciones (solo para Yacusi)
ALTER TABLE habitaciones ADD COLUMN comision_anfitriona INT NULL DEFAULT NULL AFTER tiempo;