import twilio from 'twilio';

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber =
  process.env.TWILIO_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '+14155238886';

// Verificar que las variables de entorno estén configuradas
if (!accountSid || !authToken || !whatsappNumber) {
  console.warn('⚠️  Variables de entorno de Twilio no configuradas. WhatsApp no funcionará.');
} else {
  console.log('✅ Twilio configurado correctamente');
  console.log('📱 Número de WhatsApp:', whatsappNumber);
}

// Cliente de Twilio
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface WhatsAppMessage {
  numero: string;
  mensaje: string;
}

export async function enviarWhatsApp(numero: string, mensaje: string): Promise<boolean> {
  try {
    // Si no hay configuración de Twilio, solo log
    if (!client || !whatsappNumber) {
      return true;
    }

    // Formatear número para WhatsApp (agregar código de país si no lo tiene)
    let numeroFormateado = numero;
    if (!numero.startsWith('+')) {
      numeroFormateado = `+${numero}`;
    }

    // Enviar mensaje con Twilio
    const message = await client.messages.create({
      body: mensaje,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${numeroFormateado}`
    });

    return true;
  } catch (error) {
    // Si es un error de Twilio, mostrar detalles
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
• Total: $${datos.total?.toLocaleString() || 0}
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
• Total: $${datos.total?.toLocaleString() || 0}
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
