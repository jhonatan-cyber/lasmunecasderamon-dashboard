import { query, generateUUID } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
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
    const exception =
      error instanceof Error ? error : new Error('Error desconocido al añadir log de venta');
    logger.error('[DB] Error al añadir log de venta', {
      error: exception.message,
      stack: exception.stack,
      ventaId,
      tipoEvento
    });
  }
};
