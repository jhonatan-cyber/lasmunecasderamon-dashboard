/**
 * Infraestructura del módulo Caja para las solicitudes de cierre. SQL privado:
 * nadie fuera de `modules/caja` importa este archivo (§5).
 *
 * Esta consulta vivía dentro del webhook de WhatsApp, que no es dueño de `cajas`.
 *
 * El resto de la caja (apertura, retiros, saldos y el propio procesamiento del
 * cierre) sigue en `CashRegisterRepository` y `CashRegisterService`: migrarlos
 * cambiaría el orden de los efectos sobre `clientes` y es trabajo de la fase 5.
 */
import { query } from '@/lib/database/db';
import type { SolicitudCierrePendiente } from '../contracts';

/** Cierres esperando confirmación, del más reciente al más antiguo. */
export async function listarSolicitudesCierrePendientes(): Promise<SolicitudCierrePendiente[]> {
  return await query<SolicitudCierrePendiente[]>(
    `SELECT s.id, s.token, s.caja_id, s.solicitado_por, s.monto_cierre_calculado,
                  s.saldo_clientes_descontado, s.fecha_solicitud as fecha_mod
           FROM solicitudes_cierre_caja s
           WHERE s.estado = 'pendiente'
           ORDER BY s.fecha_solicitud DESC`
  );
}
