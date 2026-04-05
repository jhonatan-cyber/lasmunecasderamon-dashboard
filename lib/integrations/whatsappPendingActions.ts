import { query as dbQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { enviarWhatsApp as sendWhatsApp } from '@/lib/integrations/whatsappService';
import { buildSolicitudRespuestaMessage } from '@/lib/notifications/notificationMessages';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/lib/integrations/pushNotifications';

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

type CuentaCommissionRow = {
  id_detalle_cuenta: string;
  hostess_id: string | null;
  comision: number;
};

type NotificationRecipientRow = {
  id_usuario: string;
  rol_nombre: string;
};

async function notifySolicitudResolution(
  solicitud: PendingSolicitud,
  accion: Action,
  estadoTexto: string
) {
  const recipients = (await dbQuery(
    `SELECT u.id_usuario, LOWER(r.nombre) as rol_nombre
     FROM usuarios u
     INNER JOIN roles r ON u.rol_id = r.id_rol
     WHERE LOWER(r.nombre) IN ('administrador', 'cajero')`
  )) as NotificationRecipientRow[];

  const entidad = solicitud.tipo === 'venta' ? 'venta' : solicitud.tipo === 'cuenta' ? 'cuenta' : 'servicio';
  const actionText = accion === 'confirmar' ? 'aprobada' : 'rechazada';
  const title = `Solicitud de anulacion ${actionText}`;
  const body = `La ${entidad} ${solicitud.codigo} de ${solicitud.cliente_nombre} fue ${estadoTexto}.`;
  const payload = {
    tipo: solicitud.tipo,
    codigo: solicitud.codigo,
    clienteNombre: solicitud.cliente_nombre,
    total: Number(solicitud.total || 0),
    accion,
    estadoTexto,
  };

  for (const recipient of recipients) {
    await NotificationRepository.create({
      usuario_id: recipient.id_usuario,
      tipo: 'solicitud_anulacion_resultado',
      titulo: title,
      mensaje: body,
      estado: 1,
      data: JSON.stringify(payload),
    });
  }

  sendNotificationToAll('anulacion_processed', payload);

  const pushTitle = accion === 'confirmar' ? 'Solicitud aprobada' : 'Solicitud rechazada';
  const pushBody = `${solicitud.codigo} - ${solicitud.cliente_nombre}`;
  await Promise.allSettled([
    sendPushByRole('cajero', pushTitle, pushBody, payload),
    sendPushByRole('administrador', pushTitle, pushBody, payload),
  ]);
}

async function adjustCuentaCommission(
  cuentaId: string | undefined,
  currentTotal: number,
  remainingTotal: number
) {
  if (!cuentaId) return 0;

  const detailRows = (await dbQuery(
    'SELECT id_detalle_cuenta, hostess_id, comision FROM detalle_cuentas WHERE cuenta_id = ? ORDER BY fecha_crea ASC',
    [cuentaId]
  )) as CuentaCommissionRow[];

  const currentCommissionTotal = detailRows.reduce((sum, row) => sum + Number(row.comision || 0), 0);
  if (currentCommissionTotal <= 0) {
    await dbQuery('UPDATE cuentas SET total_comision = ? WHERE id_cuenta = ?', [0, cuentaId]);
    return 0;
  }

  const remainingCommission =
    currentTotal > 0 && remainingTotal > 0
      ? Math.round((currentCommissionTotal * remainingTotal) / currentTotal)
      : 0;

  const baseRows = detailRows.map((row) => ({
    ...row,
    nextComision:
      remainingCommission > 0
        ? Math.floor((Number(row.comision || 0) * remainingCommission) / currentCommissionTotal)
        : 0,
  }));

  let assigned = baseRows.reduce((sum, row) => sum + row.nextComision, 0);
  let remainder = Math.max(0, remainingCommission - assigned);

  const hostessAnchors = new Map<string, number>();
  baseRows.forEach((row, index) => {
    const key = String(row.hostess_id || `sin_hostess_${index}`);
    if (!hostessAnchors.has(key)) {
      hostessAnchors.set(key, index);
    }
  });

  const distributionIndexes = Array.from(hostessAnchors.values());
  let cursor = 0;
  while (remainder > 0 && distributionIndexes.length > 0) {
    const rowIndex = distributionIndexes[cursor % distributionIndexes.length];
    baseRows[rowIndex].nextComision += 1;
    remainder -= 1;
    cursor += 1;
  }

  for (const row of baseRows) {
    await dbQuery('UPDATE detalle_cuentas SET comision = ? WHERE id_detalle_cuenta = ?', [
      row.nextComision,
      row.id_detalle_cuenta,
    ]);
  }

  await dbQuery('UPDATE cuentas SET total_comision = ? WHERE id_cuenta = ?', [
    remainingCommission,
    cuentaId,
  ]);

  return remainingCommission;
}

export async function processPendingSolicitud(
  solicitud: PendingSolicitud,
  accion: Action,
  adminWhatsApp: string
) {
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
        ? (Number(solicitud.monto || 0) > 0 && Number(solicitud.monto || 0) < Number(solicitud.total || 0)
            ? 'anulada parcialmente'
            : 'anulada')
        : solicitud.tipo === 'cuenta'
          ? 'anulada'
        : 'devuelto'
      : solicitud.tipo === 'venta'
        ? 'activa'
        : solicitud.tipo === 'cuenta'
          ? 'activa'
        : 'activo';

  const now = getNowInBusinessTimezone();
  if (solicitud.tipo === 'venta') {
    if (accion === 'confirmar' && solicitud.id_venta) {
      await SaleRepository.approveAnulacion(
        solicitud.id_venta,
        'whatsapp',
        Number(solicitud.monto || 0)
      );
    } else if (solicitud.id_venta) {
      const ventasInfo = (await dbQuery(
        'SELECT habitacion_id, tiempo FROM ventas WHERE id_venta = ? LIMIT 1',
        [solicitud.id_venta]
      )) as Array<{ habitacion_id: string | null; tiempo: number }>;
      const nextState =
        ventasInfo.length && ventasInfo[0].habitacion_id && Number(ventasInfo[0].tiempo || 0) > 0
          ? 2
          : 1;
      await dbQuery('UPDATE ventas SET estado = ?, fecha_mod = ? WHERE id_venta = ?', [
        nextState,
        now,
        solicitud.id_venta,
      ]);
    }
  } else if (solicitud.tipo === 'cuenta') {
    const requestedAmount = Number(solicitud.monto || 0);
    const cuentaInfo = (await dbQuery(
      'SELECT total FROM cuentas WHERE id_cuenta = ? LIMIT 1',
      [solicitud.id_cuenta]
    )) as Array<{ total: number }>;

    const currentTotal = Number(cuentaInfo[0]?.total || 0);
    const remainingTotal = Math.max(0, currentTotal - requestedAmount);
    const nextCuentaState = accion === 'confirmar'
      ? (remainingTotal > 0 ? 4 : 3)
      : 1;

    let nextCommissionTotal = 0;
    if (accion === 'confirmar') {
      nextCommissionTotal = await adjustCuentaCommission(solicitud.id_cuenta, currentTotal, remainingTotal);
    } else {
      const commissionRows = (await dbQuery(
        'SELECT COALESCE(SUM(comision), 0) as total FROM detalle_cuentas WHERE cuenta_id = ?',
        [solicitud.id_cuenta]
      )) as Array<{ total: number }>;
      nextCommissionTotal = Number(commissionRows[0]?.total || 0);
    }

    await dbQuery(
      'UPDATE cuentas SET total = ?, total_comision = ?, estado = ?, fecha_mod = ? WHERE id_cuenta = ?',
      [accion === 'confirmar' ? remainingTotal : currentTotal, nextCommissionTotal, nextCuentaState, now, solicitud.id_cuenta]
    );

    if (solicitud.solicitud_id) {
      await dbQuery(
        'UPDATE solicitudes_anulacion_cuentas SET estado = ?, approved_by = ?, fecha_mod = ? WHERE id = ?',
        [accion === 'confirmar' ? 'aprobado' : 'rechazado', 'whatsapp', now, solicitud.solicitud_id]
      );
    }
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

  await notifySolicitudResolution(solicitud, accion, estadoTexto);
  await sendWhatsApp(adminWhatsApp, mensajeRespuesta);
}
