import twilio from 'twilio';
import { credencialesParaWebhook } from '@/modules/comunicaciones';

export function whatsappWebhookUrl(path: string): string {
  const base =
    process.env.TWILIO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
  if (!base) throw new Error('Configura TWILIO_WEBHOOK_BASE_URL para los webhooks de WhatsApp');
  return new URL(path, base).toString();
}

/**
 * Use the configured public origin: Next.js sees the internal Nginx upstream URL.
 *
 * La firma puede venir de la cuenta global o de la cuenta propia de cualquier
 * administrador (cada uno puede enviar desde su Twilio). Se prueban sólo las
 * credenciales cuyo Account SID coincide con el del callback.
 */
export async function validarWebhookTwilio(request: Request): Promise<boolean> {
  try {
    const signature = request.headers.get('x-twilio-signature');
    if (!signature) return false;
    const body = await request.clone().formData();
    const params: Record<string, string> = {};
    for (const [key, value] of body.entries()) {
      if (typeof value === 'string') params[key] = value;
    }
    const candidatas = (await credencialesParaWebhook()).filter(
      credencial => credencial.accountSid === params.AccountSid
    );
    if (candidatas.length === 0) return false;
    const internal = new URL(request.url);
    const publicUrl = whatsappWebhookUrl(internal.pathname + internal.search);
    return candidatas.some(credencial =>
      twilio.validateRequest(credencial.authToken, signature, publicUrl, params)
    );
  } catch {
    return false;
  }
}
