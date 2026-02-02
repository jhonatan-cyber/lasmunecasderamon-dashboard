-- Migration: Add created_by column to ventas table
-- Date: 2026-02-02
-- Description: Adds created_by column to track which user created each sale

ALTER TABLE ventas 
ADD COLUMN created_by INT NULL,
ADD CONSTRAINT fk_ventas_created_by 
FOREIGN KEY (created_by) REFERENCES usuarios(id_usuario) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for better performance
CREATE INDEX idx_ventas_created_by ON ventas(created_by);

-- Add comment to document the column
ALTER TABLE ventas MODIFY COLUMN created_by INT NULL COMMENT 'ID del usuario que creó la venta';