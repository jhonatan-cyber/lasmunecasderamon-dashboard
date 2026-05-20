import twilio from 'twilio';
import { formatDateLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import logger from '../utils/logger';

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber =
  process.env.TWILIO_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '+14155238886';

// Verificar que las variables de entorno estén configuradas
if (!accountSid || !authToken || !whatsappNumber) {
  logger.warn('⚠️  Variables de entorno de Twilio no configuradas. WhatsApp no funcionará.');
} else {
  logger.warn('✅ Twilio configurado correctamente');
  logger.warn('📱 Número de WhatsApp:', whatsappNumber);
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function enviarWhatsApp(numero: string, mensaje: string): Promise<boolean> {
  if (!client || !whatsappNumber) {
    logger.error('❌ Twilio no configurado. No se puede enviar WhatsApp.');
    throw new Error(
      'Twilio no está configurado. Verifica TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_NUMBER'
    );
  }
  const numeroFormateado = `+${numero.replace(/^\+/, '')}`;

  try {
    const result = await client.messages.create({
      body: mensaje,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${numeroFormateado}`
    });

    logger.info(`✅ WhatsApp enviado a ${numeroFormateado}. SID: ${result.sid}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Error enviando WhatsApp a ${numeroFormateado}: ${message}`);
    throw error;
  }
}

export async function enviarMensajeSolicitudAnulacion(datos: {
  numeroAdmin: string;
  tipo: 'venta' | 'servicio' | 'cuenta';
  codigo: string;
  clienteNombre: string;
  total: number;
  motivo: string;
  solicitadoPor: string;
  montoSolicitado?: number;
  habitacion?: string | null;
  tiempo?: number | null;
  token?: string;
  baseUrl?: string;
}): Promise<boolean> {
  const titulo =
    datos.tipo === 'venta'
      ? 'SOLICITUD DE ANULACION DE VENTA'
      : datos.tipo === 'cuenta'
        ? 'SOLICITUD DE ANULACION DE CUENTA'
        : 'SOLICITUD DE ANULACION DE SERVICIO';

  const detalleExtra =
    datos.tipo === 'cuenta'
      ? `• Monto solicitado: ${formatCurrencyCLP(datos.montoSolicitado || 0)}\n• Total referencia: ${formatCurrencyCLP(datos.total || 0)}`
      : datos.tipo === 'servicio'
        ? `${datos.habitacion ? `• Habitacion: ${datos.habitacion}\n` : ''}${datos.tiempo ? `• Tiempo: ${datos.tiempo} minutos\n` : ''}• Total: ${formatCurrencyCLP(datos.total || 0)}`
        : `• Monto solicitado: ${formatCurrencyCLP(datos.montoSolicitado || 0)}\n• Total referencia: ${formatCurrencyCLP(datos.total || 0)}`;

  const routePath =
    datos.tipo === 'venta'
      ? '/confirmar-anulacion'
      : datos.tipo === 'servicio'
        ? '/confirmar-anulacion-servicio'
        : '/confirmar-anulacion-cuenta';
  const actionUrl =
    datos.token && datos.baseUrl
      ? `${datos.baseUrl}${routePath}?token=${encodeURIComponent(datos.token)}`
      : null;

  const mensaje = `*${titulo}*

• Codigo: ${datos.codigo}
• Cliente: ${datos.clienteNombre}
${detalleExtra}

*Motivo:*
${datos.motivo || 'No especificado'}

*Solicitado por:* ${datos.solicitadoPor}

${
  actionUrl
    ? `*Revisar solicitud:* ${actionUrl}`
    : 'Responde "SI" para aprobar o "NO" para rechazar.'
}

Si hay varias solicitudes pendientes, responde "1 SI" o "1 NO" sobre la mas reciente.`;

  return await enviarWhatsApp(datos.numeroAdmin, mensaje);
}

export async function enviarMensajeAnulacion(datos: {
  numeroAdmin: string;
  codigoVenta: string;
  clienteNombre: string;
  total: number;
  fechaVenta: string;
  motivo: string;
  solicitadoPor: string;
  anfitrionas?: string[];
  token?: string;
  baseUrl?: string;
}): Promise<boolean> {
  const anfitrionasTexto =
    datos.anfitrionas && datos.anfitrionas.length > 0
      ? `• Anfitrionas: ${datos.anfitrionas.join(', ')}`
      : '• Anfitrionas: Venta en barra';

  const mensaje = `🚨 *SOLICITUD DE ANULACIÓN DE VENTA*

📋 *Detalles de la venta:*
• Código: ${datos.codigoVenta}
• Cliente: ${datos.clienteNombre}
${anfitrionasTexto}
• Total: ${formatCurrencyCLP(datos.total || 0)}
• Fecha: ${datos.fechaVenta}

📝 *Motivo de anulación:*
${datos.motivo}

👤 *Solicitado por:* ${datos.solicitadoPor}

${
  datos.token && datos.baseUrl
    ? `
✅ *Para confirmar o rechazar:* ${datos.baseUrl}/confirmar-anulacion?token=${datos.token}

_Haz clic en el link para revisar y confirmar o rechazar esta solicitud_`
    : `
✅ *Para confirmar:* Responde "SI" o "CONFIRMAR"
❌ *Para rechazar:* Responde "NO" o "RECHAZAR"

_El administrador puede aprobar o rechazar esta solicitud respondiendo al mensaje_`
}`;

  return await enviarWhatsApp(datos.numeroAdmin, mensaje);
}

export async function enviarMensajeDevolucionServicio(datos: {
  numeroAdmin: string;
  codigoServicio: string;
  clienteNombre: string;
  total: number;
  fechaServicio: string;
  motivo: string;
  solicitadoPor: string;
  habitacion?: string;
  tiempo?: number;
  anfitrionas?: string[];
  token?: string;
  baseUrl?: string;
}): Promise<boolean> {
  const anfitrionasTexto =
    datos.anfitrionas && datos.anfitrionas.length > 0
      ? `• Anfitrionas: ${datos.anfitrionas.join(', ')}`
      : '• Anfitrionas: No especificadas';

  const habitacionTexto = datos.habitacion
    ? `• Habitación: ${datos.habitacion}`
    : '• Habitación: No especificada';

  const tiempoTexto = datos.tiempo
    ? `• Tiempo: ${datos.tiempo} minutos`
    : '• Tiempo: No especificado';

  const mensaje = `🚨 *SOLICITUD DE ANULACIÓN DE SERVICIO*

📋 *Detalles del servicio:*
• Código: ${datos.codigoServicio}
• Cliente: ${datos.clienteNombre}
${habitacionTexto}
${tiempoTexto}
${anfitrionasTexto}
• Total: ${formatCurrencyCLP(datos.total || 0)}
• Fecha: ${datos.fechaServicio}

📝 *Motivo de anulación:*
${datos.motivo}

👤 *Solicitado por:* ${datos.solicitadoPor}

${
  datos.token && datos.baseUrl
    ? `
✅ *Para confirmar o rechazar:* ${datos.baseUrl}/confirmar-anulacion-servicio?token=${datos.token}

_Haz clic en el link para revisar y confirmar o rechazar esta solicitud_`
    : `
✅ *Para confirmar:* Responde "SI" o "CONFIRMAR"
❌ *Para rechazar:* Responde "NO" o "RECHAZAR"

_El administrador puede aprobar o rechazar esta solicitud respondiendo al mensaje_`
}`;

  return await enviarWhatsApp(datos.numeroAdmin, mensaje);
}

export async function enviarMensajeTerminoServicio(datos: {
  numeroAdmin: string;
  codigoServicio: string;
  habitacion: string;
  tiempoEfectivo: string;
  anfitrionas: string[];
}): Promise<boolean> {
  const mensaje = `✅ *SERVICIO FINALIZADO*

📋 *Detalles:*
• Código: ${datos.codigoServicio}
• Habitación: ${datos.habitacion}
• Duración: ${datos.tiempoEfectivo}
• Anfitrionas: ${datos.anfitrionas.join(', ')}

_El servicio ha terminado y la habitación ha sido liberada._`;

  return await enviarWhatsApp(datos.numeroAdmin, mensaje);
}

export async function enviarMensajeAnticipo(datos: {
  numeroAdmin: string;
  solicitudId: string;
  usuarioNombre: string;
  monto: number;
  motivo: string;
  token: string;
  baseUrl: string;
}): Promise<boolean> {
  const confirmUrl = `${datos.baseUrl}/confirmar-anticipo?token=${datos.token}`;
  const bizNow = getNowInBusinessTimezone();
  const fechaActual = formatDateLabel(new Date(bizNow.replace(' ', 'T')), 'es-ES');

  const mensaje = `💰 *SOLICITUD DE ANTICIPO*

📋 *Detalles de la solicitud:*
• ID Solicitud: #${datos.solicitudId}
• Usuario: ${datos.usuarioNombre}
• Monto: ${formatCurrencyCLP(datos.monto)}
• Fecha: ${fechaActual}

📝 *Motivo del anticipo:*
${datos.motivo || 'No especificado'}

👤 *Solicitado por:* ${datos.usuarioNombre}


✅ *Para confirmar o rechazar:* ${confirmUrl}

_Haz clic en el link para revisar y procesar esta solicitud desde el panel de administración_`;

  return await enviarWhatsApp(datos.numeroAdmin, mensaje);
}

export async function enviarRespuestaAnticipo(datos: {
  numeroUsuario: string;
  solicitudId: string;
  monto: number;
  estado: 'aprobada' | 'rechazada';
  motivoRechazo?: string;
}): Promise<boolean> {
  const emoji = datos.estado === 'aprobada' ? '✅' : '❌';
  const titulo = datos.estado === 'aprobada' ? 'APROBADO' : 'RECHAZADO';

  let mensaje = `${emoji} *ANTICIPO ${titulo}*

Hola, tu solicitud de anticipo #${datos.solicitudId} por ${formatCurrencyCLP(datos.monto)} ha sido *${datos.estado}*.`;

  if (datos.estado === 'aprobada') {
    mensaje += `\n\nYa puedes pasar por caja a retirar tu dinero.`;
  } else if (datos.motivoRechazo) {
    mensaje += `\n\n*Motivo:* ${datos.motivoRechazo}`;
  }

  return await enviarWhatsApp(datos.numeroUsuario, mensaje);
}
