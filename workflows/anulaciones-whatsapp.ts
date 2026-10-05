import 'server-only';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { estadoTrasSolicitud, marcarEstadoVenta } from '@/modules/ventas';
import { listarDestinatariosAnulaciones } from '@/modules/identidad';
import { procesarAnulacionCuentaCanal } from '@/modules/operacion';
import { enviarWhatsApp as sendWhatsApp } from '@/modules/comunicaciones';
import { buildSolicitudRespuestaMessage } from '@/lib/notifications/notificationMessages';
import { NotificationService } from '@/modules/comunicaciones';
import { SaleService } from '@/workflows/ventas';
import { ServiceService } from '@/modules/operacion';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/modules/comunicaciones';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import logger from '@/lib/utils/logger';

type PendingSolicitud = {
  tipo: 'venta' | 'servicio' | 'cuenta';
  solicitud_id?: string;
  id_venta?: string;
  id_servicio?: string;
  id_cuenta?: string;
  codigo: string;
  cliente_nombre: string;
  total: number;
  monto?: number;
};

type Action = 'confirmar' | 'rechazar';

async function notifySolicitudResolution(
  solicitud: PendingSolicitud,
  accion: Action,
  estadoTexto: string
) {
  const recipients = await listarDestinatariosAnulaciones();

  const entidad =
    solicitud.tipo === 'venta' ? 'venta' : solicitud.tipo === 'cuenta' ? 'cuenta' : 'servicio';
  const actionText = accion === 'confirmar' ? 'aprobada' : 'rechazada';
  const title = `Solicitud de anulacion ${actionText}`;
  const body = `La ${entidad} ${solicitud.codigo} de ${solicitud.cliente_nombre} fue ${estadoTexto}.`;
  const payload = {
    tipo: solicitud.tipo,
    codigo: solicitud.codigo,
    clienteNombre: solicitud.cliente_nombre,
    total: Number(solicitud.total || 0),
    accion,
    estadoTexto
  };

  for (const recipient of recipients) {
    await NotificationService.create({
      usuario_id: recipient.id_usuario,
      tipo: 'solicitud_anulacion_resultado',
      titulo: title,
      mensaje: body,
      estado: 1,
      data: JSON.stringify(payload)
    });
  }

  sendNotificationToAll('anulacion_processed', payload);

  const pushTitle = accion === 'confirmar' ? 'Solicitud aprobada' : 'Solicitud rechazada';
  const pushBody = `${solicitud.codigo} - ${solicitud.cliente_nombre}`;
  await Promise.allSettled([
    sendPushByRole('cajero', pushTitle, pushBody, payload),
    sendPushByRole('administrador', pushTitle, pushBody, payload)
  ]);
}

export async function processPendingSolicitud(solicitud: PendingSolicitud, accion: Action) {
  const nuevoEstado =
    accion === 'confirmar'
      ? solicitud.tipo === 'venta'
        ? 0
        : solicitud.tipo === 'cuenta'
          ? 3
          : 3
      : 1;
  const estadoTexto =
    accion === 'confirmar'
      ? solicitud.tipo === 'venta'
        ? Number(solicitud.monto || 0) > 0 &&
          Number(solicitud.monto || 0) < Number(solicitud.total || 0)
          ? 'anulada parcialmente'
          : 'anulada'
        : solicitud.tipo === 'cuenta'
          ? 'anulada'
          : 'devuelto'
      : solicitud.tipo === 'venta'
        ? 'activa'
        : solicitud.tipo === 'cuenta'
          ? 'activa'
          : 'activo';

  if (solicitud.tipo === 'venta') {
    if (solicitud.solicitud_id) {
      await SaleService.processAnulacion(
        solicitud.solicitud_id,
        'whatsapp',
        accion === 'confirmar' ? 'confirmada' : 'rechazada'
      );
    } else if (accion === 'confirmar' && solicitud.id_venta) {
      await SaleService.approveAnulacion(
        solicitud.id_venta,
        'whatsapp',
        Number(solicitud.monto || 0)
      );
    } else if (solicitud.id_venta) {
      await enUnaUnidad(unidad =>
        unidad.ejecutar(async contexto => {
          const nextState = await estadoTrasSolicitud(solicitud.id_venta!, contexto);
          await marcarEstadoVenta(solicitud.id_venta!, nextState, contexto);
        })
      );
    }
  } else if (solicitud.tipo === 'cuenta') {
    await procesarAnulacionCuentaCanal(solicitud, accion);
  } else {
    if (solicitud.solicitud_id) {
      await ServiceService.processAnulacion(
        solicitud.solicitud_id,
        'whatsapp',
        accion === 'confirmar' ? 'confirmada' : 'rechazada'
      );
    }
  }

  const mensajeRespuesta = buildSolicitudRespuestaMessage({
    tipo: solicitud.tipo,
    codigo: solicitud.codigo,
    clienteNombre: solicitud.cliente_nombre,
    total: solicitud.total || 0,
    action: accion,
    estadoTexto
  });

  await notifySolicitudResolution(solicitud, accion, estadoTexto);
  try {
    const adminWhatsApp = await getAdminWhatsApp();
    await sendWhatsApp(adminWhatsApp, mensajeRespuesta);
  } catch (err) {
    logger.error('[WhatsappPendingActions] Error enviando respuesta por WhatsApp:', { err });
  }
}
