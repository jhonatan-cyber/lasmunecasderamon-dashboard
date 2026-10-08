import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CashRegisterService } from '@/modules/caja';
import { crearTokenCajaReporte } from '@/lib/api/cajaReportePdfToken';
import { enviarReporteCajaWhatsApp } from '@/modules/comunicaciones';
import logger from '@/lib/utils/logger';

function mensajeEnvioFallido(error: unknown): string {
  const code = Number((error as { code?: number } | null)?.code);
  const conocidos: Record<number, string> = {
    20003: 'Twilio rechazó las credenciales. Revisa Account SID y Auth Token.',
    21211: 'El número de WhatsApp del administrador no es válido.',
    21606: 'El número emisor no está habilitado para WhatsApp en Twilio.',
    63007: 'El número emisor no está habilitado para WhatsApp en Twilio.',
    63015: 'El destinatario debe unirse al Sandbox de Twilio antes de recibir mensajes.',
    63016: 'Inicia una conversación con el Sandbox o utiliza una plantilla aprobada.'
  };
  if (conocidos[code]) return conocidos[code];
  if (error instanceof Error && /twilio no configurado/i.test(error.message)) {
    return 'Falta configurar las credenciales de Twilio en Configuración → WhatsApp.';
  }
  if (error instanceof Error && /whatsapp del administrador/i.test(error.message)) {
    return 'Configura el número de WhatsApp del administrador en Configuración → WhatsApp.';
  }
  if (error instanceof Error && /número de destino inválido/i.test(error.message)) {
    return 'El número de WhatsApp del administrador no tiene un formato válido.';
  }
  if (error instanceof Error && /url pública https/i.test(error.message)) {
    return 'El PDF requiere una URL pública HTTPS accesible por WhatsApp/Twilio. Revisa TWILIO_WEBHOOK_BASE_URL o NEXT_PUBLIC_BASE_URL.';
  }
  return code
    ? `Twilio rechazó el envío (código ${code}). Revisa la configuración de WhatsApp.`
    : 'No se pudo enviar el mensaje. Revisa la configuración de WhatsApp e inténtalo de nuevo.';
}

/** Comparte con el administrador el detalle actual de caja por WhatsApp. */
export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const caja = await CashRegisterService.getById(id);
    if (!caja) {
      return NextResponse.json({ success: false, message: 'Caja no encontrada' }, { status: 404 });
    }

    try {
      const token = await crearTokenCajaReporte(id);
      await enviarReporteCajaWhatsApp({ cajaId: id, token });
    } catch (error) {
      const code = Number((error as { code?: number } | null)?.code);
      logger.error('Falló el envío del detalle de caja por WhatsApp', {
        cajaId: id,
        ...(Number.isFinite(code) && code > 0 ? { twilioCode: code } : {}),
        errorType: error instanceof Error ? error.name : typeof error
      });
      return NextResponse.json(
        { success: false, message: mensajeEnvioFallido(error) },
        { status: 502 }
      );
    }
    return NextResponse.json({
      success: true,
      message: 'Reporte PDF de caja enviado por WhatsApp'
    });
  }
);
