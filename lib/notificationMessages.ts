import { formatCurrencyCLP } from '@/lib/formatters';
import { formatLongDateEs } from '@/lib/calendarUtils';

type OrderPushBodyInput = {
  codigo: string;
  clienteNombre: string;
  total: number;
};

type AnticipoRequestMessageInput = {
  nombreCompleto: string;
  usuarioNick: string;
  montoSolicitado: number;
  motivo?: string | null;
  montoAsistencia: number;
  montoComision: number;
  montoPropina: number;
  montoMaximo: number;
  anticipoId: string;
  fecha?: Date;
};

type ServicioAnulacionMessageInput = {
  action: 'confirmar' | 'rechazar';
  codigo: string;
  cliente: string;
  habitacion: string;
  total: number;
};

type VentaAnulacionMessageInput = {
  action: 'confirmar' | 'rechazar';
  codigo: string;
  cliente: string;
  total: number;
};

type AnticipoProcessedMessageInput = {
  action: 'approved' | 'rejected';
  empleadoNombre: string;
  monto: number;
  fecha?: Date;
};

type PendingSolicitudInput = {
  tipo: 'venta' | 'servicio' | 'anticipo';
  codigo: string;
  clienteNombre: string;
  total: number;
};

type SolicitudRespuestaInput = {
  tipo: 'venta' | 'servicio';
  codigo: string;
  clienteNombre: string;
  total: number;
  action: 'confirmar' | 'rechazar';
  estadoTexto: string;
};

export function buildAnticipoNotFoundMessage(anticipoId: string) {
  return `⚠️ No se encontró la solicitud de anticipo #${anticipoId}. Verifica el número e intenta de nuevo.`;
}

export function buildOrderPushBody({ codigo, clienteNombre, total }: OrderPushBodyInput) {
  return `Pedido #${codigo} de ${clienteNombre} por ${formatCurrencyCLP(total)}`;
}

export function buildAnticipoRequestMessage({
  nombreCompleto,
  usuarioNick,
  montoSolicitado,
  motivo,
  montoAsistencia,
  montoComision,
  montoPropina,
  montoMaximo,
  anticipoId,
  fecha = new Date(),
}: AnticipoRequestMessageInput) {
  return `💰 *NUEVA SOLICITUD DE ANTICIPO*

👤 *Empleado:* ${nombreCompleto}
📱 *Usuario:* ${usuarioNick}
💵 *Monto solicitado:* ${formatCurrencyCLP(montoSolicitado)}
📝 *Motivo:* ${motivo || 'No especificado'}

📊 *Disponible:*
• Asistencia: ${formatCurrencyCLP(montoAsistencia)}
• Comisiones: ${formatCurrencyCLP(montoComision)}
• Propinas: ${formatCurrencyCLP(montoPropina)}
• Total: ${formatCurrencyCLP(montoMaximo)}

⏰ *Fecha:* ${formatLongDateEs(fecha)}

✅ *Para aprobar:* Responde "APROBAR ${anticipoId}"
❌ *Para rechazar:* Responde "RECHAZAR ${anticipoId}"

_O también puedes aprobar/rechazar desde el panel administrativo_`;
}

export function buildServicioAnulacionMessage({
  action,
  codigo,
  cliente,
  habitacion,
  total,
}: ServicioAnulacionMessageInput) {
  const emoji = action === 'confirmar' ? '✅' : '❌';
  const titulo = action === 'confirmar' ? 'SERVICIO ANULADO' : 'ANULACIÓN RECHAZADA';
  return `${emoji} *${titulo}*

El servicio con código *${codigo}* ha sido ${action === 'confirmar' ? 'anulado' : 'mantenido activo'}.

📋 *Detalles:*
• Cliente: ${cliente}
• Habitación: ${habitacion}
• Total: ${formatCurrencyCLP(total)}`;
}

export function buildVentaAnulacionMessage({
  action,
  codigo,
  cliente,
  total,
}: VentaAnulacionMessageInput) {
  const emoji = action === 'confirmar' ? '✅' : '❌';
  const titulo = action === 'confirmar' ? 'CONFIRMADA' : 'RECHAZADA';
  return `${emoji} *ANULACIÓN ${titulo}*

La venta con código *${codigo}* ha sido ${action === 'confirmar' ? 'anulada' : 'mantenida'}.

📋 *Detalles:*
• Cliente: ${cliente}
• Total: ${formatCurrencyCLP(total)}`;
}

export function buildAnticipoProcessedMessages({
  action,
  empleadoNombre,
  monto,
  fecha = new Date(),
}: AnticipoProcessedMessageInput) {
  const approved = action === 'approved';
  const emoji = approved ? '✅' : '❌';
  const titulo = approved ? 'ANTICIPO APROBADO' : 'ANTICIPO RECHAZADO';

  return {
    empleado: `${emoji} *${titulo}*

Tu solicitud de anticipo ha sido ${approved ? 'aprobada' : 'rechazada'}.

💵 *Monto:* ${formatCurrencyCLP(monto)}
📅 *Fecha:* ${formatLongDateEs(fecha)}

${approved ? 'El monto será descontado de tu próxima liquidación.' : 'Por favor, contacta al administrador para más información.'}`,
    administrador: `${emoji} *${titulo}*

👤 *Empleado:* ${empleadoNombre}
💵 *Monto:* ${formatCurrencyCLP(monto)}

_El empleado ha sido notificado._`,
  };
}

export function buildMultipleSolicitudesPendingMessage(solicitudes: PendingSolicitudInput[]) {
  const listaSolicitudes = solicitudes
    .map(
      (s, index) =>
        `${index + 1}. ${s.tipo === 'venta' ? 'VENTA' : s.tipo === 'servicio' ? 'SERVICIO' : 'ANTICIPO'} ${s.codigo} - ${s.clienteNombre} - ${formatCurrencyCLP(s.total || 0)}`
    )
    .join('\n');

  return `📋 *MÚLTIPLES SOLICITUDES PENDIENTES*

${listaSolicitudes}

*Para responder, especifica el número:*
• "1 SI" o "1 CONFIRMAR" - Para confirmar la primera
• "2 NO" o "2 RECHAZAR" - Para rechazar la segunda
• etc.

*O responde solo "SI"/"NO" para la más reciente*`;
}

export function buildSolicitudRespuestaMessage({
  tipo,
  codigo,
  clienteNombre,
  total,
  action,
  estadoTexto,
}: SolicitudRespuestaInput) {
  const emoji = action === 'confirmar' ? '✅' : '❌';
  const titulo =
    action === 'confirmar'
      ? tipo === 'venta'
        ? 'ANULACIÓN CONFIRMADA'
        : 'DEVOLUCIÓN CONFIRMADA'
      : tipo === 'venta'
        ? 'ANULACIÓN RECHAZADA'
        : 'DEVOLUCIÓN RECHAZADA';

  return `${emoji} *${titulo}*

📋 *${tipo === 'venta' ? 'Venta' : 'Servicio'} ${estadoTexto}:*
• Código: ${codigo}
• Cliente: ${clienteNombre}
• Total: ${formatCurrencyCLP(total)}

${action === 'confirmar'
    ? tipo === 'venta'
      ? '_La venta ha sido anulada exitosamente._'
      : '_El servicio ha sido devuelto exitosamente. Habitación liberada y caja actualizada._'
    : tipo === 'venta'
      ? '_La venta ha sido mantenida activa._'
      : '_El servicio ha sido mantenido activo. Temporizador reanudado._'
  }`;
}
