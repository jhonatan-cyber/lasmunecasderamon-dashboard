import { query } from '@/lib/database/db';
import { NotificationService } from '@/modules/comunicaciones';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/modules/comunicaciones';
import logger from '@/lib/utils/logger';
import type { ShotAlert } from '@/modules/inventario/contracts';

/** Tipo de notificación persistida para el aviso (campanita / historial). */
export const BAR_SHOT_ALERT_TIPO = 'bar_shot_alert';

function mensajeDe(alertas: ShotAlert[]): string {
  return alertas
    .map(
      alerta =>
        `${alerta.nombre}: quedan ${alerta.shots_restantes} shot(s) (${alerta.ml_restante} ml)`
    )
    .join(' · ');
}

const DESTINATARIOS_BARMAN = `SELECT u.id_usuario FROM usuarios u
   INNER JOIN roles r ON r.id_rol = u.rol_id
   WHERE LOWER(r.nombre) = 'barman' AND u.estado = 1`;

const DESTINATARIOS_ADMIN = `SELECT u.id_usuario FROM usuarios u
   INNER JOIN roles r ON r.id_rol = u.rol_id
   WHERE LOWER(r.nombre) = 'administrador' AND u.estado = 1`;

/**
 * Avisa a quienes sirven el bar cuando una botella abierta bajó del umbral de shots
 * restantes configurado en Configuraciones → Bar.
 *
 * Se ejecuta **después** de confirmar la transacción de la venta: notificar dentro haría
 * que una venta revertida dejara un aviso fantasma. Nunca lanza: un fallo aquí no puede
 * tumbar una venta ya registrada.
 */
export async function notifyBarShotAlerts(alertas?: ShotAlert[] | null): Promise<void> {
  if (!alertas || alertas.length === 0) return;
  try {
    const mensaje = mensajeDe(alertas);
    const barmans = await query<any[]>(DESTINATARIOS_BARMAN);
    const destinatarios = barmans.length > 0 ? barmans : await query<any[]>(DESTINATARIOS_ADMIN);
    const rol = barmans.length > 0 ? 'barman' : 'administrador';

    for (const destinatario of destinatarios) {
      await NotificationService.create({
        usuario_id: destinatario.id_usuario,
        tipo: BAR_SHOT_ALERT_TIPO,
        titulo: 'Botella por agotarse',
        mensaje,
        estado: 1,
        data: JSON.stringify({ alertas })
      });
    }

    // En vivo: la audiencia del evento (barman + administrador) la define sseEvents.ts.
    sendNotificationToAll('bar_shot_alert', { alertas, mensaje });
    await sendPushByRole(rol, 'Botella por agotarse', mensaje, { tipo: BAR_SHOT_ALERT_TIPO });
  } catch (error) {
    logger.captureException(error, { context: 'notifyBarShotAlerts' });
  }
}
