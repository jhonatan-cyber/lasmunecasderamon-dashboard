import { query as dbQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { enviarWhatsApp as sendWhatsApp } from '@/lib/integrations/whatsappService';
import { buildSolicitudRespuestaMessage } from '@/lib/notifications/notificationMessages';

type PendingSolicitud = {
  tipo: 'venta' | 'servicio';
  id_venta?: string;
  id_servicio?: string;
  codigo: string;
  cliente_nombre: string;
  total: number;
};

type Action = 'confirmar' | 'rechazar';

type CajaActiva = {
  efectivo: number;
  iva: number;
  devoluciones: number;
  id_caja: string;
};

type ServicioInfo = {
  total: number;
  iva: number;
};

export async function processPendingSolicitud(
  solicitud: PendingSolicitud,
  accion: Action,
  adminWhatsApp: string
) {
  const nuevoEstado =
    accion === 'confirmar'
      ? solicitud.tipo === 'venta'
        ? 0
        : 3
      : 1;
  const estadoTexto =
    accion === 'confirmar'
      ? solicitud.tipo === 'venta'
        ? 'anulada'
        : 'devuelto'
      : solicitud.tipo === 'venta'
        ? 'activa'
        : 'activo';

  const now = getNowInBusinessTimezone();
  if (solicitud.tipo === 'venta') {
    await dbQuery('UPDATE ventas SET estado = ?, fecha_mod = ? WHERE id_venta = ?', [
      nuevoEstado,
      now,
      solicitud.id_venta,
    ]);
  } else {
    await dbQuery('UPDATE servicios SET estado = ?, fecha_mod = ? WHERE id_servicio = ?', [
      nuevoEstado,
      now,
      solicitud.id_servicio,
    ]);

    if (accion === 'confirmar') {
      await dbQuery(
        'UPDATE habitaciones SET estado = 1 WHERE id_habitacion = (SELECT habitacion_id FROM servicios WHERE id_servicio = ?)',
        [solicitud.id_servicio]
      );

      const cajaActiva = (await dbQuery(
        'SELECT * FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      )) as CajaActiva[];

      if (cajaActiva && cajaActiva.length > 0) {
        const caja = cajaActiva[0];
        const servicioInfo = (await dbQuery(
          'SELECT total, iva FROM servicios WHERE id_servicio = ?',
          [solicitud.id_servicio]
        )) as ServicioInfo[];

        if (servicioInfo && servicioInfo.length > 0) {
          const servicio = servicioInfo[0];
          const totalServicio = servicio.total || 0;
          const ivaServicio = servicio.iva || 0;

          const nuevoEfectivo = Math.max(0, caja.efectivo - totalServicio);
          const nuevaIva = Math.max(0, caja.iva - ivaServicio);
          const nuevaDevoluciones = caja.devoluciones + totalServicio;

          await dbQuery(
            `UPDATE cajas 
             SET efectivo = ?, iva = ?, devoluciones = ?
             WHERE id_caja = ?`,
            [nuevoEfectivo, nuevaIva, nuevaDevoluciones, caja.id_caja]
          );
        }
      }
    }
  }

  const mensajeRespuesta = buildSolicitudRespuestaMessage({
    tipo: solicitud.tipo,
    codigo: solicitud.codigo,
    clienteNombre: solicitud.cliente_nombre,
    total: solicitud.total || 0,
    action: accion,
    estadoTexto,
  });

  await sendWhatsApp(adminWhatsApp, mensajeRespuesta);
}
