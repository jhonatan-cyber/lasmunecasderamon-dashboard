-- Migration: Add created_by field to servicios table
-- This field will track which user created each service

ALTER TABLE `servicios` 
ADD COLUMN `created_by` int DEFAULT NULL AFTER `estado`,
ADD KEY `fk_servicios_created_by` (`created_by`),
ADD CONSTRAINT `fk_servicios_created_by` FOREIGN KEY (`created_by`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;