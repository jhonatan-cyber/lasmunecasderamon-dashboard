import twilio from 'twilio';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import { ROUTES } from '@/lib/constants/routes';
import logger from '../utils/logger';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber =
  process.env.TWILIO_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '+14155238886';

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
      ? ROUTES.CONFIRMAR_ANULACION
      : datos.tipo === 'servicio'
        ? ROUTES.CONFIRMAR_ANULACION_SERVICIO
        : ROUTES.CONFIRMAR_ANULACION_CUENTA;
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

  const adminWhatsApp = await getAdminWhatsApp();
  return await enviarWhatsApp(adminWhatsApp, mensaje);
}

export async function enviarRecordatorioDevolucionSaldo(datos: {
  clienteNombre: string;
  clienteRun?: string | null;
  telefono: string | null;
  monto: number;
  motivo?: string | null;
  solicitadoPor: string;
  saldoActual?: number | null;
}): Promise<boolean> {
  const mensaje = `*🔔 RECORDATORIO DEVOLUCION DE SALDO*

• Cliente: ${datos.clienteNombre}${datos.clienteRun ? ` (${datos.clienteRun})` : ''}
• Telefono: ${datos.telefono || 'No registrado'}
• Monto solicitado: ${formatCurrencyCLP(datos.monto)}
${datos.saldoActual != null ? `• Saldo actual: ${formatCurrencyCLP(datos.saldoActual)}` : ''}
${datos.motivo ? `• Motivo: ${datos.motivo}` : ''}

*Solicitado por (cajero):* ${datos.solicitadoPor}

Por favor revisar en dashboard: Clientes → Devolucion`;

  const adminWhatsApp = await getAdminWhatsApp();
  // Fallback a ADMIN_WHATSAPP_NUMBER si no hay config en DB
  const numeroAdmin = adminWhatsApp || (process.env.ADMIN_WHATSAPP_NUMBER || '').replace('whatsapp:', '');
  if (!numeroAdmin) {
    logger.error('❌ No hay numero de admin para recordatorio devolucion');
    throw new Error('Numero de admin no configurado');
  }
  return await enviarWhatsApp(numeroAdmin, mensaje);
}


