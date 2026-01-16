-- Migración: Agregar campo genera_comision a detalle_pedidos
-- Fecha: 2026-01-15
-- Descripción: Permite diferenciar productos que generan comisión (para las chicas) 
--              de los que no generan comisión (para el cliente)

-- Agregar columna genera_comision (1 = genera comisión, 0 = no genera comisión)
ALTER TABLE `detalle_pedidos` 
ADD COLUMN `genera_comision` TINYINT(1) NOT NULL DEFAULT 1 
COMMENT 'Indica si el producto genera comisión para las anfitrionas (1=Sí, 0=No)' 
AFTER `comision`;

-- Actualizar registros existentes para que generen comisión por defecto
UPDATE `detalle_pedidos` SET `genera_comision` = 1 WHERE `genera_comision` IS NULL;

-- Comentarios:
-- genera_comision = 1: Producto para las chicas (genera comisión)
-- genera_comision = 0: Producto para el cliente (no genera comisión)
