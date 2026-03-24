import { query, generateUUID } from './db';
import { logger } from './logger';

export const initLogsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS servicio_logs (
        id VARCHAR(36) PRIMARY KEY,
        servicio_id VARCHAR(36) NOT NULL,
        tipo_evento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_id VARCHAR(36),
        INDEX (servicio_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await query(createTableQuery);
    logger.info('[DB] Tabla servicio_logs inicializada');
  } catch (error) {
    const exception = error instanceof Error ? error : new Error('Error desconocido al inicializar servicio_logs');
    logger.error('[DB] Error al inicializar servicio_logs', {
      error: exception.message,
      stack: exception.stack,
    });
  }
};

export const addServicioLog = async (
  servicioId: string | number,
  tipoEvento: string,
  descripcion: string,
  usuarioId?: string | number
) => {
  try {
    await query(
      'INSERT INTO servicio_logs (id, servicio_id, tipo_evento, descripcion, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [generateUUID(), servicioId, tipoEvento, descripcion, usuarioId || null]
    );
  } catch (error) {
    const exception = error instanceof Error ? error : new Error('Error desconocido al añadir log');
    logger.error('[DB] Error al añadir log', {
      error: exception.message,
      stack: exception.stack,
      servicioId,
      tipoEvento,
    });
  }
};
