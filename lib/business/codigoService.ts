import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { generateRandomCode } from '@/lib/utils/codeUtils';

/**
 * Registra un nuevo código en la tabla codigos y retorna el nuevo código.
 */
export async function regenerateAttendanceCode(): Promise<string> {
  const newCode = generateRandomCode();
  try {
    // Siguiendo la lógica original: borramos códigos anteriores antes de insertar uno nuevo
    await query('DELETE FROM codigos');

    const fechaSQL = getNowInBusinessTimezone();
    const { generateUUID } = require('@/lib/database/db');

    await query('INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, ?, 1)', [
      generateUUID(),
      newCode,
      fechaSQL
    ]);




    // Al regenerar el código, notificamos a todos los clientes (especialmente cajeros)
    try {
      const { sendNotificationToAll } = await import('@/lib/api/sseService');
      sendNotificationToAll('code_changed', { codigo: newCode });
    } catch (sseError) {
      logger.error('[CodigoService] Error enviando notificación SSE del código', { error: sseError });
    }



    return newCode;
  } catch (error) {
    const exception = error instanceof Error ? error : new Error('Error desconocido al regenerar código');
    logger.error('[CodigoService] Error al regenerar código', {
      error: exception.message,
      stack: exception.stack,
      actionType: 'ATTENDANCE_CODE_ERROR',
    });
    throw error;
  }
}
