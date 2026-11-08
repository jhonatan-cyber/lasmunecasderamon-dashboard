import twilio from 'twilio';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { getTwilioConfig, type TwilioConfig } from '@/lib/business/twilioConfig';
import { resolverDestinosWhatsApp } from './administradores';
import { ROUTES } from '@/lib/constants/routes';
import logger from '@/lib/utils/logger';
import { normalizeWhatsAppPhone } from '@/lib/utils/whatsappPhone';

/**
 * Envía un mensaje puntual con las credenciales dadas (por defecto, las globales).
 * El fan-out a administradores pasa las credenciales de cada uno para poder enviar
 * desde su propia cuenta de Twilio.
 */
export async function enviarWhatsAppConEstado(
  numero: string,
  mensaje: string,
  tipo: 'mensaje' | 'prueba' = 'mensaje',
  mediaUrls?: string[],
  credenciales?: Pick<TwilioConfig, 'accountSid' | 'authToken' | 'whatsappNumber'>
) {
  const { accountSid, authToken, whatsappNumber } = credenciales ?? (await getTwilioConfig());
  if (!accountSid || !authToken || !whatsappNumber) throw new Error('Twilio no configurado');
  const numeroFormateado = normalizeWhatsAppPhone(numero);
  const { whatsappWebhookUrl } = await import('@/lib/integrations/twilioWebhook');
  const callback =
    process.env.TWILIO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL
      ? whatsappWebhookUrl('/api/whatsapp/status')
      : null;
  const result = await twilio(accountSid, authToken).messages.create({
    body: mensaje,
    from: `whatsapp:${whatsappNumber}`,
    to: `whatsapp:${numeroFormateado}`,
    ...(mediaUrls?.length ? { mediaUrl: mediaUrls } : {}),
    ...(callback?.startsWith('https://') ? { statusCallback: callback } : {})
  });
  let seguimientoGuardado = true;
  try {
    const { registrarEntregaWhatsApp } = await import('./seguimiento');
    await registrarEntregaWhatsApp({
      sid: result.sid,
      accountSid,
      destino: numeroFormateado,
      estado: result.status,
      tipo
    });
  } catch {
    seguimientoGuardado = false;
    logger.error('No se pudo registrar el seguimiento de WhatsApp', { sid: result.sid });
  }
  if (
    result.status === 'failed' ||
    result.status === 'undelivered' ||
    result.status === 'canceled'
  ) {
    throw new Error('WhatsApp rechazó el envío');
  }
  return {
    sid: result.sid,
    estado: result.status,
    destino: `••••${numeroFormateado.slice(-4)}`,
    seguimientoGuardado
  };
}

export async function enviarWhatsApp(numero: string, mensaje: string): Promise<boolean> {
  await enviarWhatsAppConEstado(numero, mensaje);
  return true;
}

export interface ResultadoEnvioAdministradores {
  enviados: number;
  total: number;
  /** Números de destino enmascarados, para mostrar sin exponer el número completo. */
  destinos: string[];
}

/**
 * Envía un aviso a todos los administradores con WhatsApp configurado —o al número
 * global como respaldo—. Cada administrador recibe desde su propia cuenta de Twilio
 * a su propio número, así el aviso llega aunque estén en países distintos.
 *
 * Lanza si no hay ningún destino o si todos los envíos fallan.
 */
export async function enviarWhatsAppAAdministradores(
  mensaje: string,
  tipo: 'mensaje' | 'prueba' = 'mensaje',
  mediaUrls?: string[]
): Promise<ResultadoEnvioAdministradores> {
  const destinos = await resolverDestinosWhatsApp();
  if (destinos.length === 0) throw new Error('Configura el WhatsApp del administrador');

  const resultados = await Promise.allSettled(
    destinos.map(destino =>
      enviarWhatsAppConEstado(destino.destino, mensaje, tipo, mediaUrls, {
        accountSid: destino.accountSid,
        authToken: destino.authToken,
        whatsappNumber: destino.whatsappNumber
      })
    )
  );

  resultados.forEach((resultado, indice) => {
    if (resultado.status === 'rejected') {
      logger.error('No se pudo enviar WhatsApp a un administrador', {
        administrador: destinos[indice].nombre,
        motivo:
          resultado.reason instanceof Error ? resultado.reason.message : String(resultado.reason)
      });
    }
  });

  const enviados = resultados.filter(resultado => resultado.status === 'fulfilled').length;
  if (enviados === 0) throw new Error('WhatsApp rechazó el envío a todos los administradores');

  return {
    enviados,
    total: destinos.length,
    destinos: destinos.map(destino => `••••${destino.destino.slice(-4)}`)
  };
}

export async function enviarPruebaWhatsApp() {
  return enviarWhatsAppAAdministradores(
    'Mensaje de prueba de Las Muñecas de Ramon. La conexión de WhatsApp está funcionando.',
    'prueba'
  );
}

/** Envía al administrador el arqueo final de caja como documento PDF por WhatsApp. */
export async function enviarPdfCierreCajaWhatsApp(datos: {
  cajaId: string;
  token: string;
}): Promise<boolean> {
  const baseUrl =
    process.env.TWILIO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
  if (!baseUrl) throw new Error('Configura la URL pública HTTPS del dashboard');
  const url = new URL(
    `/api/cashregister/closing-pdf?token=${encodeURIComponent(datos.token)}`,
    baseUrl
  );
  if (url.protocol !== 'https:') {
    throw new Error('El PDF de cierre requiere una URL pública HTTPS para WhatsApp');
  }

  await enviarWhatsAppAAdministradores(
    `Caja ${datos.cajaId.slice(0, 8)} cerrada. Adjunto el detalle final del cierre en PDF.`,
    'mensaje',
    [url.toString()]
  );
  return true;
}

/** Envía al administrador el reporte PDF con gráficos de la caja desde su detalle. */
export async function enviarReporteCajaWhatsApp(datos: {
  cajaId: string;
  token: string;
}): Promise<boolean> {
  const bases = [
    process.env.TWILIO_WEBHOOK_BASE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.BASE_URL
  ].filter((base): base is string => Boolean(base));
  const basePublica = bases.find(base => {
    try {
      return new URL(base).protocol === 'https:';
    } catch {
      return false;
    }
  });
  if (!basePublica) {
    throw new Error('Configura una URL pública HTTPS accesible para adjuntar el reporte PDF');
  }

  const pdfUrl = new URL(
    `/api/cashregister/pdf-report?token=${encodeURIComponent(datos.token)}`,
    basePublica
  );
  const mensaje = `*REPORTE DE CAJA*\nCaja ${datos.cajaId.slice(0, 8)}. Adjunto el informe PDF con el resumen financiero y los gráficos del turno.`;
  await enviarWhatsAppAAdministradores(mensaje, 'mensaje', [pdfUrl.toString()]);
  return true;
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

  const resultado = await enviarWhatsAppAAdministradores(mensaje);
  return resultado.enviados > 0;
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
  saldoClientesPorDevolver?: number;
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
• Saldos de clientes cubiertos con efectivo: -${formatCurrencyCLP(datos.saldoClientes)}
• Saldo pendiente de devolución: ${formatCurrencyCLP(datos.saldoClientesPorDevolver || 0)}

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

  // Sin ningún destino la función lanza: el cajero se queda esperando una
  // autorización que nadie puede dar.
  const resultado = await enviarWhatsAppAAdministradores(mensaje);
  return resultado.enviados > 0;
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

  const resultado = await enviarWhatsAppAAdministradores(mensaje);
  return resultado.enviados > 0;
}
