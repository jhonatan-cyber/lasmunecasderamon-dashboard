import { NextRequest, NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { enviarPruebaWhatsApp, historialWhatsApp } from '@/modules/comunicaciones';
import { whatsappWebhookUrl } from '@/lib/integrations/twilioWebhook';
import { checkRateLimit } from '@/lib/middleware/redisRateLimit';

export const GET = withRoute({ auth: true, module: 'settings', action: 'read' }, async () => {
  return NextResponse.json({
    success: true,
    data: {
      incomingUrl: whatsappWebhookUrl('/api/whatsapp/webhook'),
      statusCallbackUrl: whatsappWebhookUrl('/api/whatsapp/status'),
      messages: await historialWhatsApp()
    }
  });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request, { user }) => {
    const limit = await checkRateLimit(new NextRequest(request), {
      windowMs: 30_000,
      max: 1,
      prefix: `whatsapp-test:${user.id}`
    });
    if (limit && !limit.allowed)
      return NextResponse.json(
        { success: false, message: 'Espera 30 segundos antes de enviar otra prueba.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter || 30) } }
      );
    try {
      const data = await enviarPruebaWhatsApp();
      return NextResponse.json({
        success: true,
        data,
        message:
          'Twilio aceptó el mensaje. El estado de entrega se actualizará cuando llegue el callback.'
      });
    } catch (error) {
      const code = Number((error as { code?: number }).code);
      const errors: Record<number, string> = {
        20003: 'Twilio rechazó las credenciales. Revisa Account SID y Auth Token.',
        21211: 'El número de destino no es válido.',
        63007: 'El número emisor no está habilitado para WhatsApp en Twilio.',
        63015: 'El destinatario debe unirse al Sandbox de Twilio.',
        63016: 'Inicia una conversación con el Sandbox o utiliza una plantilla aprobada.'
      };
      return NextResponse.json(
        {
          success: false,
          message:
            errors[code] ||
            (code
              ? `Twilio rechazó la prueba (código ${code}).`
              : 'No se pudo enviar la prueba. Revisa la configuración guardada de WhatsApp.')
        },
        { status: 502 }
      );
    }
  }
);
