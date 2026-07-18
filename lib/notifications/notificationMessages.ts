import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ROUTES } from '@/lib/constants/routes';

function getNowDate() {
  const bizNow = getNowInBusinessTimezone();
  return new Date(bizNow.replace(' ', 'T'));
}

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
  baseUrl?: string;
  token?: string;
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
  tipo: 'venta' | 'servicio' | 'cuenta' | 'anticipo';
  codigo: string;
  clienteNombre: string;
  total: number;
};

type SolicitudRespuestaInput = {
  tipo: 'venta' | 'servicio' | 'cuenta';
  codigo: string;
  clienteNombre: string;
  total: number;
  action: 'confirmar' | 'rechazar';
  estadoTexto: string;
};

export function buildAnticipoNotFoundMessage(anticipoId: string) {
  return `No se encontró la solicitud de anticipo #${anticipoId}. Verifica el número e intenta de nuevo.`;
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
  fecha = getNowDate(),
  baseUrl,
  token,
}: AnticipoRequestMessageInput) {
  const confirmUrl = baseUrl && token ? `${baseUrl}${ROUTES.CONFIRMAR_ANTICIPO}?token=${token}` : null;

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
${confirmUrl ? `
✅ *Para procesar:* ${confirmUrl}

_Haz clic en el link para aprobar o rechazar la solicitud_
` : `
✅ *Para aprobar:* Responde "APROBAR ${anticipoId}"
❌ *Para rechazar:* Responde "RECHAZAR ${anticipoId}"

_O también puedes aprobar/rechazar desde el panel administrativo_`
    }`;
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
  fecha = getNowDate(),
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
        `${index + 1}. ${s.tipo === 'venta' ? 'VENTA' : s.tipo === 'servicio' ? 'SERVICIO' : s.tipo === 'cuenta' ? 'CUENTA' : 'ANTICIPO'} ${s.codigo} - ${s.clienteNombre} - ${formatCurrencyCLP(s.total || 0)}`
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
  const emoji = action === 'confirmar' ? 'OK' : 'NO';
  const titulo =
    action === 'confirmar'
      ? tipo === 'venta'
        ? 'ANULACION CONFIRMADA'
        : tipo === 'cuenta'
          ? 'ANULACION CONFIRMADA'
          : 'DEVOLUCION CONFIRMADA'
      : tipo === 'venta'
        ? 'ANULACION RECHAZADA'
        : tipo === 'cuenta'
          ? 'ANULACION RECHAZADA'
          : 'DEVOLUCION RECHAZADA';

  const entidad = tipo === 'venta' ? 'Venta' : tipo === 'cuenta' ? 'Cuenta' : 'Servicio';

  return `${emoji} *${titulo}*

*${entidad} ${estadoTexto}:*
- Codigo: ${codigo}
- Cliente: ${clienteNombre}
- Total: ${formatCurrencyCLP(total)}

${action === 'confirmar'
      ? tipo === 'venta'
        ? '_La venta ha sido anulada exitosamente._'
        : tipo === 'cuenta'
          ? '_La cuenta ha sido anulada exitosamente._'
          : '_El servicio ha sido devuelto exitosamente. Habitacion liberada y caja actualizada._'
      : tipo === 'venta'
        ? '_La venta ha sido mantenida activa._'
        : tipo === 'cuenta'
          ? '_La cuenta ha sido mantenida activa._'
          : '_El servicio ha sido mantenido activo. Temporizador reanudado._'
    }`;
}
