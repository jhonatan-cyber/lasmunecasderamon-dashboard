import twilio from 'twilio';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import { getTwilioConfig } from '@/lib/business/twilioConfig';
import { ROUTES } from '@/lib/constants/routes';
import logger from '../utils/logger';

export async function enviarWhatsApp(numero: string, mensaje: string): Promise<boolean> {
  const { accountSid, authToken, whatsappNumber } = await getTwilioConfig();
  const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

  if (!client || !whatsappNumber) {
    logger.error('❌ Twilio no configurado. No se puede enviar WhatsApp.');
    throw new Error(
      'Twilio no está configurado. Configura TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_NUMBER en Configuraciones → WhatsApp (o en el .env)'
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

/**
 * Datos del aviso de cierre de caja, compartidos por el aviso original y el reenvío.
 */
export interface DatosSolicitudCierreCaja {
  cajaId: string;
  cajeroNombre: string;
  fechaApertura: string;
  montoApertura: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  devoluciones: number;
  retiroTotal?: number;
  /** Movimiento del turno: qué produjo la caja, además del dinero que hay en el cajón. */
  ventas?: number;
  servicios?: number;
  propinas?: number;
  comisiones?: number;
  anticipos?: number;
  iva?: number;
  /** Prepago de clientes del turno. */
  prepagoCargado?: number;
  prepagoConsumido?: number;
  prepagoPendienteClientes?: number;
  saldoClientes: number;
  montoCierre: number;
  motivo?: string | null;
  token?: string;
  baseUrl?: string;
  /** `true` cuando es un reenvío: el admin ya lo vio antes y hay que distinguirlo. */
  reenvio?: boolean;
}

/**
 * Arma el aviso al administrador de que el cajero quiere cerrar la caja.
 *
 * El mensaje no es informativo: la caja **sigue abierta** hasta que el admin autorice desde
 * el link. Por eso lleva el detalle del turno completo —movimiento (ventas, servicios,
 * propinas, comisiones, anticipos, IVA), dinero en el cajón (apertura, efectivo, tarjeta,
 * transferencia, devoluciones, retiros y los saldos de clientes a descontar) y el prepago de
 * clientes—, así puede decidir sin abrir el dashboard.
 *
 * Está separado del envío para poder probar el texto sin Twilio: lo que el administrador
 * decide es exactamente lo que dice este mensaje.
 */
export function construirMensajeSolicitudCierreCaja(datos: DatosSolicitudCierreCaja): string {
  const actionUrl =
    datos.token && datos.baseUrl
      ? `${datos.baseUrl}${ROUTES.CONFIRMAR_CIERRE_CAJA}?token=${encodeURIComponent(datos.token)}`
      : null;

  return `*CIERRE DE CAJA - PENDIENTE DE AUTORIZACION${datos.reenvio ? ' (REENVIO)' : ''}*

• Caja: ${datos.cajaId}
• Abierta el: ${datos.fechaApertura}
• Solicitado por: ${datos.cajeroNombre}

*Movimiento del turno*
• Ventas: ${formatCurrencyCLP(datos.ventas || 0)}
• Servicios: ${formatCurrencyCLP(datos.servicios || 0)}
• Propinas: ${formatCurrencyCLP(datos.propinas || 0)}
• Comisiones: ${formatCurrencyCLP(datos.comisiones || 0)}
• Anticipos: ${formatCurrencyCLP(datos.anticipos || 0)}
• IVA: ${formatCurrencyCLP(datos.iva || 0)}

*Dinero en caja*
• Apertura: ${formatCurrencyCLP(datos.montoApertura)}
• Efectivo: ${formatCurrencyCLP(datos.efectivo)}
• Tarjeta: ${formatCurrencyCLP(datos.tarjeta)}
• Transferencia: ${formatCurrencyCLP(datos.transferencia)}
• Devoluciones: -${formatCurrencyCLP(datos.devoluciones)}
• Anticipos (ya descontados del efectivo): -${formatCurrencyCLP(datos.anticipos || 0)}
• Retiros (ya descontados del efectivo): -${formatCurrencyCLP(datos.retiroTotal || 0)}
• Saldos de clientes a descontar: -${formatCurrencyCLP(datos.saldoClientes)}

_Efectivo es lo que queda en el cajón: retiros y anticipos ya salieron._

*Prepago de clientes*
• Cargado en el turno: ${formatCurrencyCLP(datos.prepagoCargado || 0)}
• Consumido: ${formatCurrencyCLP(datos.prepagoConsumido || 0)}
• Pendiente de clientes: ${formatCurrencyCLP(datos.prepagoPendienteClientes || 0)}

*Monto de cierre previsto:* ${formatCurrencyCLP(datos.montoCierre)}
${datos.motivo ? `\n*Motivo:*\n${datos.motivo}\n` : ''}
${
  actionUrl
    ? `*Autorizar o rechazar el cierre:* ${actionUrl}`
    : 'Responde "cierre si" para autorizar el cierre o "cierre no" para rechazarlo.'
}

La caja queda *abierta* hasta que autorices el cierre.`;
}

/** Envía al administrador el aviso del cierre (el original o un reenvío). */
export async function enviarMensajeSolicitudCierreCaja(
  datos: DatosSolicitudCierreCaja
): Promise<boolean> {
  const mensaje = construirMensajeSolicitudCierreCaja(datos);

  const adminWhatsApp = await getAdminWhatsApp();
  // Sin número no hay a dónde avisar: el cajero se queda esperando una
  // autorización que nadie puede dar.
  if (!adminWhatsApp) {
    logger.error('❌ No hay numero de admin para la solicitud de cierre de caja');
    throw new Error('Numero de admin no configurado');
  }
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

  const numeroAdmin = await getAdminWhatsApp();
  if (!numeroAdmin) {
    logger.error('❌ No hay numero de admin para recordatorio devolucion');
    throw new Error('Numero de admin no configurado');
  }
  return await enviarWhatsApp(numeroAdmin, mensaje);
}
