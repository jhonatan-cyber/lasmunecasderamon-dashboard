import twilio from 'twilio';
import { getTwilioConfig } from '@/lib/business/twilioConfig';

export function whatsappWebhookUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
  if (!base) throw new Error('Configura NEXT_PUBLIC_BASE_URL para los webhooks de WhatsApp');
  return new URL(path, base).toString();
}

/** Use the configured public origin: Next.js sees the internal Nginx upstream URL. */
export async function validarWebhookTwilio(request: Request): Promise<boolean> {
  try {
    const { authToken, accountSid } = await getTwilioConfig();
    const signature = request.headers.get('x-twilio-signature');
    if (!authToken || !accountSid || !signature) return false;
    const body = await request.clone().formData();
    const params: Record<string, string> = {};
    for (const [key, value] of body.entries()) {
      if (typeof value === 'string') params[key] = value;
    }
    if (params.AccountSid !== accountSid) return false;
    const internal = new URL(request.url);
    const publicUrl = whatsappWebhookUrl(internal.pathname + internal.search);
    return twilio.validateRequest(authToken, signature, publicUrl, params);
  } catch {
    return false;
  }
}
