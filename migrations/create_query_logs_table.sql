-- Migration: Create query_logs table for slow query monitoring
-- Almacena queries lentas detectadas por el logger en lib/database/db.ts
-- para monitoreo en producción sin depender solo de archivos de log.

CREATE TABLE IF NOT EXISTS `query_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `sql` text NOT NULL COMMENT 'Query text (truncated to 500 chars)',
  `params_count` int(11) NOT NULL DEFAULT 0,
  `duration_ms` decimal(10,1) NOT NULL COMMENT 'Query duration in milliseconds',
  `query_type` varchar(20) NOT NULL COMMENT 'query, transaction_query, or transaction',
  `query_count` int(11) DEFAULT NULL COMMENT 'For transaction level logs: number of queries in transaction',
  `avg_query_ms` decimal(10,1) DEFAULT NULL COMMENT 'For transaction level logs: average query time',
  `total_query_time_ms` decimal(10,1) DEFAULT NULL COMMENT 'For transaction level logs: total query time',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_query_logs_created_at` (`created_at`),
  KEY `idx_query_logs_duration_ms` (`duration_ms`),
  KEY `idx_query_logs_type` (`query_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Slow queries (>50ms) registradas automaticamente por db.ts';
