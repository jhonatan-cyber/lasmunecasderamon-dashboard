import { query } from '@/lib/database/db';
import { NotificationService } from '@/modules/comunicaciones';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/modules/comunicaciones';
import { HORAS_ENVASE_SIN_CONFIRMAR, obtenerResumenEnvases } from '@/modules/inventario';
import type { ResumenEnvases } from '@/modules/inventario/contracts';
import logger from '@/lib/utils/logger';

/** Tipo de notificación persistida para el aviso (campanita / historial). */
export const WAREHOUSE_CONTAINER_ALERT_TIPO = 'warehouse_container_alert';

// El umbral y el tipo del resumen son dominio del módulo inventario; aquí sólo
// se reexportan para no cambiar la API que consumen rutas y pruebas.
export { HORAS_ENVASE_SIN_CONFIRMAR };
export type { ResumenEnvases };

/**
 * Quien recibe envases: los roles con el permiso de confirmación (migración 033)
 * más el administrador, que siempre puede confirmar.
 */
const DESTINATARIOS_ALMACEN = `SELECT u.id_usuario FROM usuarios u
   INNER JOIN roles r ON r.id_rol = u.rol_id
   WHERE LOWER(r.nombre) IN ('almacen', 'almacén', 'almacenero', 'inventario', 'administrador')
     AND u.estado = 1`;

/**
 * Contadores del control de envases. La consulta vive en el módulo inventario
 * (`obtenerResumenEnvases`); aquí sólo se conserva el nombre heredado.
 */
export async function getContainerReturnsSummary(): Promise<ResumenEnvases> {
  return await obtenerResumenEnvases();
}

const globalForAlerts = globalThis as typeof globalThis & {
  /** Último contador de vencidos avisado por esta instancia. */
  __warehouseContainerAlert?: number;
};

function mensajeDe(resumen: ResumenEnvases): string {
  return resumen.vencidos > 0
    ? `${resumen.vencidos} envase(s) entregado(s) hace más de ${HORAS_ENVASE_SIN_CONFIRMAR} horas sin recibir en almacén.`
    : 'Todos los envases entregados fueron recibidos en almacén.';
}

async function notificarAlmacen(resumen: ResumenEnvases, mensaje: string): Promise<void> {
  const destinatarios = await query<Array<{ id_usuario: string }>>(DESTINATARIOS_ALMACEN);
  for (const destinatario of destinatarios) {
    await NotificationService.create({
      usuario_id: destinatario.id_usuario,
      tipo: WAREHOUSE_CONTAINER_ALERT_TIPO,
      titulo: 'Envases esperando recepción',
      mensaje,
      estado: 1,
      data: JSON.stringify(resumen)
    });
  }
  for (const rol of ['almacen', 'administrador']) {
    await sendPushByRole(rol, 'Envases esperando recepción', mensaje, {
      tipo: WAREHOUSE_CONTAINER_ALERT_TIPO
    });
  }
}

/**
 * Avisa al almacén cuando un envase entregado lleva más de
 * `HORAS_ENVASE_SIN_CONFIRMAR` horas sin que se confirme la recepción.
 *
 * Se ejecuta desde el cron y cada vez que el panel pide su contador, así
 * funciona aunque nadie tenga la página abierta (campana + push) y en vivo para
 * quien la tenga (SSE). El último contador vive en `globalThis` —el mismo
 * patrón que `check-timers` con `__attendanceCheckDate`—: solo se avisa cuando
 * el número **cambia**, para que un chequeo cada minuto no llueva la misma
 * alerta; cuando baja a cero se emite el estado limpio para que el panel
 * apague su aviso. Nunca lanza: un fallo aquí no puede tumbar la petición que
 * lo llamó.
 */
export async function checkWarehouseContainerAlerts(): Promise<ResumenEnvases> {
  let resumen: ResumenEnvases = { pendientes: 0, vencidos: 0 };
  try {
    resumen = await getContainerReturnsSummary();

    const anterior = globalForAlerts.__warehouseContainerAlert;
    if (anterior === resumen.vencidos) return resumen;
    globalForAlerts.__warehouseContainerAlert = resumen.vencidos;

    const mensaje = mensajeDe(resumen);
    // En vivo: la audiencia del evento (almacén + administración) la define
    // sseEvents.ts. El nombre va literal porque el test de completitud del
    // catálogo escanea los literales emitidos (lo comprueba el test unitario
    // de este módulo contra WAREHOUSE_CONTAINER_ALERT_TIPO).
    sendNotificationToAll('warehouse_container_alert', {
      ...resumen,
      umbral_horas: HORAS_ENVASE_SIN_CONFIRMAR,
      mensaje
    });

    // Campana y push solo cuando el atraso crece: el contador en pantalla ya
    // cubre las variaciones y nadie quiere una notificación por cada chequeo.
    if (resumen.vencidos > (anterior ?? 0)) {
      await notificarAlmacen(resumen, mensaje);
    }
  } catch (error) {
    logger.captureException(error, { context: 'checkWarehouseContainerAlerts' });
  }
  return resumen;
}
