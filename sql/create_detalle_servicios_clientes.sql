-- Migration: Create detalle_servicios_clientes table to support multiple clients per service
CREATE TABLE IF NOT EXISTS `detalle_servicios_clientes` (
  `id_detalle_cliente` int NOT NULL AUTO_INCREMENT,
  `servicio_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_detalle_cliente`),
  KEY `fk_detalle_servicios_clientes_servicio` (`servicio_id`),
  KEY `fk_detalle_servicios_clientes_cliente` (`cliente_id`),
  CONSTRAINT `fk_detalle_servicios_clientes_servicio` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id_servicio`) ON DELETE CASCADE,
  CONSTRAINT `fk_detalle_servicios_clientes_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
