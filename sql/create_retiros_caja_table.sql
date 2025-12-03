-- Tabla para registrar el historial de retiros de caja
-- Este script es OPCIONAL pero recomendado para mantener un registro de todos los retiros

CREATE TABLE IF NOT EXISTS `retiros_caja` (
  `id_retiro` INT NOT NULL AUTO_INCREMENT,
  `id_caja` INT NOT NULL,
  `monto` DECIMAL(10,2) NOT NULL,
  `motivo` TEXT NOT NULL,
  `usuario_id` INT NOT NULL,
  `fecha_retiro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_retiro`),
  INDEX `idx_caja` (`id_caja`),
  INDEX `idx_usuario` (`usuario_id`),
  INDEX `idx_fecha` (`fecha_retiro`),
  CONSTRAINT `fk_retiros_caja` FOREIGN KEY (`id_caja`) REFERENCES `cajas` (`id_caja`) ON DELETE CASCADE,
  CONSTRAINT `fk_retiros_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios de las columnas
ALTER TABLE `retiros_caja` 
  MODIFY COLUMN `id_retiro` INT NOT NULL AUTO_INCREMENT COMMENT 'ID único del retiro',
  MODIFY COLUMN `id_caja` INT NOT NULL COMMENT 'ID de la caja de la cual se retiró el dinero',
  MODIFY COLUMN `monto` DECIMAL(10,2) NOT NULL COMMENT 'Monto retirado',
  MODIFY COLUMN `motivo` TEXT NOT NULL COMMENT 'Motivo del retiro',
  MODIFY COLUMN `usuario_id` INT NOT NULL COMMENT 'ID del usuario que realizó el retiro',
  MODIFY COLUMN `fecha_retiro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del retiro';
