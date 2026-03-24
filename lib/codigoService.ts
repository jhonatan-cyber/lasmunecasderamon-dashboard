import { query } from './db';
import { logger } from './logger';

/**
 * Genera un código de 4 dígitos aleatorio que no empiece por 0 (opcional, pero común)
 * o simplemente un código de 4 dígitos.
 */
export function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Registra un nuevo código en la tabla codigos y retorna el nuevo código.
 */
export async function regenerateAttendanceCode(): Promise<string> {
  const newCode = generateRandomCode();
  try {
    // Siguiendo la lógica original: borramos códigos anteriores antes de insertar uno nuevo
    await query('DELETE FROM codigos');

    const { getSystemTimezone } = require('./timezoneService');
    const { generateUUID } = require('./db');
    const ahora = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: getSystemTimezone(),
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const parts = formatter.formatToParts(ahora);
    const getVal = (partType: string) => parts.find(p => p.type === partType)?.value;
    const fechaSQL = `${getVal('year')}-${getVal('month')}-${getVal('day')} ${getVal('hour')}:${getVal('minute')}:${getVal('second')}`;

    await query('INSERT INTO codigos (id_codigo, codigo, fecha_crea,estado) VALUES (?, ?, ?,1)', [
      generateUUID(),
      newCode,
      fechaSQL
    ]);




    // Al regenerar el código, notificamos a todos los clientes (especialmente cajeros)
    try {
      const { sendNotificationToAll } = await import('./sseService');
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
