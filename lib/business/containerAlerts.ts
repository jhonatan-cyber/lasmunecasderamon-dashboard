import { query } from '@/lib/database/db';
import { NotificationService } from '@/lib/services/NotificationService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/lib/integrations/pushNotifications';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import logger from '@/lib/utils/logger';

/** Tipo de notificación persistida para el aviso (campanita / historial). */
export const WAREHOUSE_CONTAINER_ALERT_TIPO = 'warehouse_container_alert';

/** Horas que un envase puede estar entregado sin recibir antes de avisar. */
export const HORAS_ENVASE_SIN_CONFIRMAR = 2;

export interface ResumenEnvases {
  /** Envases entregados por el bar que el almacén todavía no confirmó. */
  pendientes: number;
  /** De esos, entregados hace más de `HORAS_ENVASE_SIN_CONFIRMAR` horas. */
  vencidos: number;
}

/**
 * Quien recibe envases: los roles con el permiso de confirmación (migración 033)
 * más el administrador, que siempre puede confirmar.
 */
const DESTINATARIOS_ALMACEN = `SELECT u.id_usuario FROM usuarios u
   INNER JOIN roles r ON r.id_rol = u.rol_id
   WHERE LOWER(r.nombre) IN ('almacen', 'almacén', 'almacenero', 'inventario', 'administrador')
     AND u.estado = 1`;

/**
 * Contadores del control de envases.
 *
 * `fecha_devolucion` es naive y la escribe la aplicación con la hora del
 * negocio, así que la comparación también se hace con esa hora y no con
 * `now()` de Postgres (que iría en la zona del servidor).
 */
export async function getContainerReturnsSummary(): Promise<ResumenEnvases> {
  const [fila] = await query<Array<{ pendientes: unknown; vencidos: unknown }>>(
    `SELECT
       COUNT(*) FILTER (WHERE u.fecha_confirmacion IS NULL) AS pendientes,
       COUNT(*) FILTER (
         WHERE u.fecha_confirmacion IS NULL
           AND u.fecha_devolucion <= (?::timestamp - interval '${HORAS_ENVASE_SIN_CONFIRMAR} hours')
       ) AS vencidos
     FROM inventario_unidades u
     WHERE u.fecha_devolucion IS NOT NULL`,
    [getNowInBusinessTimezone()]
  );
  return {
    pendientes: Number(fila?.pendientes ?? 0),
    vencidos: Number(fila?.vencidos ?? 0)
  };
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
