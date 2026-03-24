import { query } from '@/lib/db';
import { enviarWhatsApp } from '@/lib/whatsappService';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import {
  buildAnticipoNotFoundMessage,
  buildAnticipoProcessedMessages,
} from '@/lib/notificationMessages';

type AnticipoRow = {
  id: string;
  monto: number;
  empleado_nombre: string;
  telefono?: string | null;
};

type CajaActiva = {
  efectivo: number;
  id_caja: string;
};

export async function processAnticipoCommand(
  anticiposPendientes: AnticipoRow[],
  anticipoId: string,
  shouldApprove: boolean,
  adminWhatsApp: string
) {
  const anticipo = anticiposPendientes.find((a) => a.id === anticipoId);

  if (!anticipo) {
    const mensajeError = buildAnticipoNotFoundMessage(anticipoId);
    await enviarWhatsApp(adminWhatsApp, mensajeError);
    return { ok: false, message: 'Anticipo no encontrado' };
  }

  if (shouldApprove) {
    await query('UPDATE anticipos SET estado = 1, fecha_mod = NOW() WHERE id_anticipo = ?', [
      anticipoId,
    ]);

    const cajaActiva = (await query(
      'SELECT * FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    )) as CajaActiva[];

    if (cajaActiva && cajaActiva.length > 0 && cajaActiva[0].efectivo >= anticipo.monto) {
      await query('UPDATE cajas SET efectivo = efectivo - ?, anticipo = anticipo + ? WHERE estado = 1', [
        anticipo.monto,
        anticipo.monto,
      ]);
    }

    const { empleado: mensajeEmpleado, administrador: mensajeConfirmacion } =
      buildAnticipoProcessedMessages({
        action: 'approved',
        empleadoNombre: anticipo.empleado_nombre,
        monto: anticipo.monto,
      });

    await enviarWhatsApp(anticipo.telefono || '', mensajeEmpleado);
    await enviarWhatsApp(adminWhatsApp, mensajeConfirmacion);

    sendNotificationToAll('anticipo_processed', {
      id: anticipoId,
      status: 'approved',
      monto: anticipo.monto,
      empleado: anticipo.empleado_nombre,
    });
  } else {
    await query('UPDATE anticipos SET estado = 3, fecha_mod = NOW() WHERE id_anticipo = ?', [
      anticipoId,
    ]);

    const { empleado: mensajeEmpleado, administrador: mensajeConfirmacion } =
      buildAnticipoProcessedMessages({
        action: 'rejected',
        empleadoNombre: anticipo.empleado_nombre,
        monto: anticipo.monto,
      });

    await enviarWhatsApp(anticipo.telefono || '', mensajeEmpleado);
    await enviarWhatsApp(adminWhatsApp, mensajeConfirmacion);

    sendNotificationToAll('anticipo_processed', {
      id: anticipoId,
      status: 'rejected',
      monto: anticipo.monto,
      empleado: anticipo.empleado_nombre,
    });
  }

  return { ok: true, message: 'Anticipo procesado' };
}
