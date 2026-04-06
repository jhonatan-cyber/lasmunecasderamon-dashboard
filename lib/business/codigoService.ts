import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { generateRandomCode4 } from '@/lib/utils/codeUtils';
export async function regenerateAttendanceCode(): Promise<string> {
  const newCode = generateRandomCode4();
  try {
    await query('DELETE FROM codigos');

    const fechaSQL = getNowInBusinessTimezone();
    const { generateUUID } = require('@/lib/database/db');

    await query('INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, ?, 1)', [
      generateUUID(),
      newCode,
      fechaSQL
    ]);

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
