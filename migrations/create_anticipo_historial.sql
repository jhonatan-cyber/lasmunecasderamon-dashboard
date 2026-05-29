-- Migration: Create anticipo_historial table
-- This table was referenced by app/api/events/detail/[id]/route.ts getAnticipoDetail()
-- but never existed in the database.

CREATE TABLE IF NOT EXISTS `anticipo_historial` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `anticipo_id` varchar(36) NOT NULL,
  `accion` varchar(50) NOT NULL COMMENT 'accion realizada: solicitud, aprobado, rechazado, entregado, etc.',
  `usuario_id` varchar(36) DEFAULT NULL COMMENT 'usuario que realizo la accion (admin/cajero)',
  `fecha_crea` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_anticipo_historial_anticipo_id` (`anticipo_id`),
  KEY `fk_anticipo_historial_usuario_id` (`usuario_id`),
  CONSTRAINT `fk_anticipo_historial_anticipo` FOREIGN KEY (`anticipo_id`) REFERENCES `anticipos` (`id_anticipo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_anticipo_historial_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
