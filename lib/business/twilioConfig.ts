import { query } from '@/lib/database/db';

/**
 * Credenciales de Twilio para enviar WhatsApp.
 *
 * Viven en la tabla `configuraciones` (categoría `integraciones`, pestaña
 * Configuraciones → WhatsApp) para poder cambiarlas sin tocar el `.env`.
 * Cada clave vacía cae a su variable de entorno correspondiente, así el `.env`
 * sigue siendo el valor por defecto (y la salida de emergencia si algo queda mal
 * guardado en la base).
 */
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** Número emisor sin prefijo `whatsapp:`. */
  whatsappNumber: string;
}

export const TWILIO_CLAVES = [
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_whatsapp_number'
] as const;

const DEFAULT_WHATSAPP_NUMBER = '+14155238886';

let cached: TwilioConfig | null = null;

function clean(valor: string | undefined | null): string {
  return (valor || '').trim();
}

export async function getTwilioConfig(): Promise<TwilioConfig> {
  if (cached) return cached;

  const desdeDb: Record<string, string> = {};
  try {
    const rows = (await query(`SELECT clave, valor FROM configuraciones WHERE clave IN (?, ?, ?)`, [
      ...TWILIO_CLAVES
    ])) as Array<{ clave: string; valor: string | null }>;
    for (const row of rows) {
      desdeDb[row.clave] = clean(row.valor);
    }
  } catch {
    // Sin base seguimos: el `.env` cubre el vacío.
  }

  const accountSid = desdeDb.twilio_account_sid || clean(process.env.TWILIO_ACCOUNT_SID);
  const authToken = desdeDb.twilio_auth_token || clean(process.env.TWILIO_AUTH_TOKEN);
  const whatsappNumber =
    (
      desdeDb.twilio_whatsapp_number ||
      clean(process.env.TWILIO_WHATSAPP_NUMBER) ||
      DEFAULT_WHATSAPP_NUMBER
    ).replace('whatsapp:', '') || DEFAULT_WHATSAPP_NUMBER;

  cached = { accountSid, authToken, whatsappNumber };
  return cached;
}

export function clearTwilioConfigCache() {
  cached = null;
}
