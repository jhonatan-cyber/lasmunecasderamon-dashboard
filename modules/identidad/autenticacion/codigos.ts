import { query, generateUUID } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { generateRandomCode4 } from '@/lib/utils/codeUtils';

/**
 * Devuelve el codigo del local vigente y, si no hay ninguno valido, genera uno.
 *
 * El codigo es la segunda via de la asistencia (y el segundo factor del login cuando
 * no se puede escanear): se muestra solo en pantallas del local y rota en cada uso.
 * Antes esta logica estaba duplicada en /api/public/users y /api/codigo/actual, lo
 * que hacia que un endpoint publico pudiera rotarlo.
 */
export async function getOrCreateAttendanceCode(): Promise<string> {
  const actual = await query<any[]>(
    'SELECT codigo FROM codigos WHERE estado = 1 ORDER BY fecha_crea DESC LIMIT 1'
  );
  const codigo = actual[0]?.codigo;
  if (typeof codigo === 'string' && /^\d{4}$/.test(codigo)) return codigo;
  return await regenerateAttendanceCode();
}
export async function regenerateAttendanceCode(): Promise<string> {
  const newCode = generateRandomCode4();
  try {
    await query('DELETE FROM codigos');

    const fechaSQL = getNowInBusinessTimezone();

    await query('INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, ?, 1)', [
      generateUUID(),
      newCode,
      fechaSQL
    ]);

    try {
      const { sendNotificationToAll } = await import('@/lib/api/sseService');
      sendNotificationToAll('code_changed', { codigo: newCode });
    } catch (sseError) {
      logger.error('[CodigoService] Error enviando notificación SSE del código', {
        error: sseError
      });
    }

    return newCode;
  } catch (error) {
    const exception =
      error instanceof Error ? error : new Error('Error desconocido al regenerar código');
    logger.error('[CodigoService] Error al regenerar código', {
      error: exception.message,
      stack: exception.stack,
      actionType: 'ATTENDANCE_CODE_ERROR'
    });
    throw error;
  }
}
