import { query, generateUUID } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
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
      tipoEvento
    });
  }
};
