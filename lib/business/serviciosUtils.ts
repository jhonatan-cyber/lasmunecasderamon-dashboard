// Service utilities for cancellation flow and UI helpers.

import { query } from '@/lib/database/db';
import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export async function solicitarAnulacionServicio(servicioId: number, motivo: string): Promise<{ success: boolean; error?: string }> {
  try {
    const now = getNowInBusinessTimezone();
    const token = generateUUID();
    
    await query(
      `INSERT INTO solicitudes_anulacion_servicios (id, token, servicio_id, motivo, solicitado_por, fecha_solicitud, estado)
       VALUES (?, ?, ?, ?, NULL, ?, 'pendiente')`,
      [generateUUID(), token, servicioId, motivo, now]
    );
    
    return { success: true };
  } catch (error: any) {
    console.error('Error al solicitar anulación de servicio:', error);
    return { success: false, error: error.message };
  }
}
