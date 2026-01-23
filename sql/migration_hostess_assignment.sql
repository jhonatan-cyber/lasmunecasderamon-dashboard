-- Script de migración: Agregar soporte para asignación de anfitrionas por producto
-- Ejecuta este script en tu base de datos MySQL

-- Verificar si la columna ya existe antes de agregarla
SET @dbname = DATABASE();
SET @tablename = 'detalle_pedidos';
SET @columnname = 'hostess_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE detalle_pedidos ADD COLUMN hostess_id INT NULL AFTER genera_comision, ADD CONSTRAINT fk_detalle_pedidos_hostess FOREIGN KEY (hostess_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar si la columna ya existe en detalle_ventas antes de agregarla
SET @tablename = 'detalle_ventas';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE detalle_ventas ADD COLUMN hostess_id INT NULL AFTER comision, ADD CONSTRAINT fk_detalle_ventas_hostess FOREIGN KEY (hostess_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT 'Migración completada exitosamente' AS status;
