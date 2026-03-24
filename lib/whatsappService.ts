import twilio from 'twilio';
import { formatDateLabel } from './calendarUtils';
import { formatCurrencyCLP } from './formatters';

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber =
  process.env.TWILIO_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '+14155238886';

// Verificar que las variables de entorno estén configuradas
if (!accountSid || !authToken || !whatsappNumber) {
  console.warn('⚠️  Variables de entorno de Twilio no configuradas. WhatsApp no funcionará.');
} else {
  console.warn('✅ Twilio configurado correctamente');
  console.warn('📱 Número de WhatsApp:', whatsappNumber);
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function enviarWhatsApp(numero: string, mensaje: string): Promise<boolean> {
  try {
    if (!client || !whatsappNumber) {
      return true;
    }
    let numeroFormateado = numero;
    if (!numero.startsWith('+')) {
      numeroFormateado = `+${numero}`;
    }

    await client.messages.create({
      body: mensaje,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${numeroFormateado}`
    });

    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detalles del error:', error.message);
    }

    return false;
  }
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

${datos.token && datos.baseUrl
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

${datos.token && datos.baseUrl
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
  const fechaActual = formatDateLabel(new Date(), 'es-ES');
  
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

