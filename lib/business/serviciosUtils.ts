

import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { logger } from '@/lib/utils/logger';

export async function solicitarAnulacionServicio(
  servicioId: number,
  motivo: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = getNowInBusinessTimezone();
    const token = generateUUID();

    await query(
      `INSERT INTO solicitudes_anulacion_servicios (id, token, servicio_id, motivo, solicitado_por, fecha_solicitud, estado)
       VALUES (?, ?, ?, ?, NULL, ?, 'pendiente')`,
      [generateUUID(), token, servicioId, motivo, now]
    );

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('Error al solicitar anulación de servicio:', { error, servicioId });
    return { success: false, error: msg };
  }
}
