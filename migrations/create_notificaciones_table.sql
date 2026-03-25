CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` VARCHAR(36) NOT NULL,
  `usuario_id` VARCHAR(36) DEFAULT NULL,
  `rol_destinatario` VARCHAR(50) DEFAULT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `titulo` VARCHAR(255) DEFAULT NULL,
  `mensaje` TEXT DEFAULT NULL,
  `datos` TEXT DEFAULT NULL,
  `leida` TINYINT(1) NOT NULL DEFAULT 0,
  `fecha_crea` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_leida` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_usuario_leida` (`usuario_id`, `leida`),
  INDEX `idx_rol_leida` (`rol_destinatario`, `leida`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
