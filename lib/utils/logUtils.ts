import { query, generateUUID } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';

export const initLogsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS servicio_logs (
        id VARCHAR(36) PRIMARY KEY,
        servicio_id VARCHAR(36) NOT NULL,
        tipo_evento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_id VARCHAR(36)
      );
    `;
    const createVentaTableQuery = `
      CREATE TABLE IF NOT EXISTS venta_logs (
        id VARCHAR(36) PRIMARY KEY,
        venta_id VARCHAR(36) NOT NULL,
        tipo_evento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_id VARCHAR(36)
      );
    `;
    await query(createTableQuery);
    await query(createVentaTableQuery);
    logger.info('[DB] Tablas de logs inicializadas');
  } catch (error) {
    const exception = error instanceof Error ? error : new Error('Error desconocido al inicializar logs');
    logger.error('[DB] Error al inicializar logs', {
      error: exception.message,
      stack: exception.stack,
    });
  }
};

export const addVentaLog = async (
  ventaId: string | number,
  tipoEvento: string,
  descripcion: string,
  usuarioId?: string | number
) => {
  try {
    await query(
      'INSERT INTO venta_logs (id, venta_id, tipo_evento, descripcion, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [generateUUID(), ventaId, tipoEvento, descripcion, usuarioId || null]
    );
  } catch (error) {
    const exception = error instanceof Error ? error : new Error('Error desconocido al añadir log de venta');
    logger.error('[DB] Error al añadir log de venta', {
      error: exception.message,
      stack: exception.stack,
      ventaId,
      tipoEvento,
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
