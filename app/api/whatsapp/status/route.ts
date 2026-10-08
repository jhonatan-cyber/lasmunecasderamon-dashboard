import { NextResponse } from 'next/server';
import { validarWebhookTwilio } from '@/lib/integrations/twilioWebhook';
import { registrarEntregaWhatsApp } from '@/modules/comunicaciones';
import { ApiResponse } from '@/lib/api/api-response';

export async function POST(request: Request) {
  if (!(await validarWebhookTwilio(request))) {
    return NextResponse.json(
      { success: false, message: 'Firma de Twilio inválida' },
      { status: 403 }
    );
  }
  try {
    const body = await request.formData();
    await registrarEntregaWhatsApp({
      sid: String(body.get('MessageSid') || body.get('SmsSid') || ''),
      accountSid: String(body.get('AccountSid') || ''),
      destino: body.get('To')?.toString(),
      estado: String(body.get('MessageStatus') || body.get('SmsStatus') || '').toLowerCase(),
      errorCode: body.get('ErrorCode')?.toString()
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return ApiResponse.error(error);
  }
}
